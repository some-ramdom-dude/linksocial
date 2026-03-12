const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "ecfriendsclub@gmail.com";
let currentUser = null;
let userProfile = null;

function toast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}

const ui = {
    openModal: (id) => document.getElementById(id).classList.remove('hidden'),
    closeModal: (id) => document.getElementById(id).classList.add('hidden'),
    
    showView: (view) => {
        document.getElementById('feed-view').classList.toggle('hidden', view !== 'feed');
        document.getElementById('profile-view').classList.toggle('hidden', view !== 'profile');
        if(view === 'profile') ui.loadProfileTab('saved');
    },

    loadProfileTab: async (type, btn) => {
        if(btn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        const container = document.getElementById('profile-posts-container');
        container.innerHTML = '<p class="loading">Loading posts...</p>';
        
        const table = type === 'saved' ? 'saved_posts' : 'likes';
        const { data, error } = await client.from(table).select('posts(*)').eq('user_id', currentUser.id);
        
        container.innerHTML = (data && data.length) ? '' : `<p class="empty">No ${type} posts yet.</p>`;
        data?.forEach(item => {
            if(item.posts) posts.render(item.posts, container);
        });
    }
};

const profile = {
    load: async (user) => {
        currentUser = user;
        const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (error || !data) ui.openModal('onboarding-modal');
        else {
            userProfile = data;
            document.getElementById('current-user-handle-display').innerText = data.handle;
            document.getElementById('view-handle').innerText = data.handle;
            document.getElementById('view-display-name').innerText = data.display_name || data.handle;
            document.getElementById('view-pfp').src = data.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${data.handle}`;
        }
    },
    setup: async () => {
        let h = document.getElementById('set-handle').value.trim().toLowerCase();
        if(!h.startsWith('@')) h = '@' + h;
        const { data: existing } = await client.from('profiles').select('id').eq('handle', h).maybeSingle();
        if (existing) return toast("Handle taken!");

        const { error } = await client.from('profiles').upsert({ 
            id: currentUser.id, 
            handle: h,
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${h}`
        });
        
        if (error) toast("Error claiming handle.");
        else location.reload();
    }
};

const posts = {
    create: async () => {
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('link-input').value;
        
        const { data, error } = await client.from('posts').insert({
            user_id: currentUser.id,
            content: text,
            link_url: link
        }).select();

        if (error) toast("Error posting.");
        else {
            toast("Posted!");
            ui.closeModal('post-modal');
            location.reload();
        }
    },
    render: (post, container) => {
        const isMod = userProfile.role === 'admin' || userProfile.role === 'mod';
        const html = `
            <div class="post-card" id="post-${post.id}">
                ${isMod ? `<button class="mod-btn" onclick="admin.deletePost('${post.id}')">Delete</button>` : ''}
                <div class="post-header"><strong>${userProfile.handle}</strong></div>
                <p>${post.content}</p>
                ${post.link_url ? `<a href="${post.link_url}" target="_blank" class="post-link-preview">${post.link_url}</a>` : ''}
                <div class="post-actions">
                    <span class="action-item" onclick="posts.toggleAction('${post.id}', 'likes')">❤️</span>
                    <span class="action-item" onclick="posts.toggleAction('${post.id}', 'saved_posts')">🔖</span>
                </div>
            </div>`;
        container.insertAdjacentHTML('afterbegin', html);
    },
    toggleAction: async (postId, table) => {
        const { data: existing } = await client.from(table).select('*').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();
        if(existing) {
            await client.from(table).delete().eq('post_id', postId).eq('user_id', currentUser.id);
            toast("Removed!");
        } else {
            await client.from(table).insert({ post_id: postId, user_id: currentUser.id });
            toast("Saved!");
        }
    }
};

const admin = {
    deletePost: async (postId) => {
        if(confirm("Admin: Delete this post?")) {
            await client.from('posts').delete().eq('id', postId);
            document.getElementById(`post-${postId}`).remove();
            toast("Post deleted by Admin");
        }
    }
};

const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const { error } = (type === 'signup') ? await client.auth.signUp({email, password}) : await client.auth.signInWithPassword({email, password});
        if (error) toast(error.message);
    },
    loginWithGoogle: async () => {
        await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    },
    logout: async () => { await client.auth.signOut(); location.reload(); }
};

client.auth.onAuthStateChange((e, session) => {
    if (session) {
        document.getElementById('login-ui').classList.add('hidden');
        document.getElementById('main-ui').classList.remove('hidden');
        profile.load(session.user);
    } else {
        document.getElementById('login-ui').classList.remove('hidden');
        document.getElementById('main-ui').classList.add('hidden');
    }
});
