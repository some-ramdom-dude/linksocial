const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "ecfriendsclub@gmail.com";
let currentSessionUser = null;
let activeProfile = null;

function toast(msg) {
    const c = document.getElementById('toast-container');
    if(!c) return;
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
        container.innerHTML = '<p>Loading...</p>';
        
        const table = type === 'saved' ? 'saved_posts' : 'likes';
        const { data, error } = await client.from(table).select('posts(*)').eq('user_id', currentSessionUser.id);
        
        if(error) return console.error("Tab Error:", error);

        container.innerHTML = (data && data.length) ? '' : `<p>No ${type} posts.</p>`;
        data?.forEach(item => { if(item.posts) posts.render(item.posts, container); });
    }
};

const profile = {
    load: async (user) => {
        currentSessionUser = user;
        console.log("Logged in as:", user.email);

        const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
        
        if (error || !data) {
            console.log("No profile found, opening onboarding.");
            ui.openModal('onboarding-modal');
        } else {
            activeProfile = data;
            document.getElementById('current-user-handle-display').innerText = data.handle;
            document.getElementById('view-handle').innerText = data.handle;
            document.getElementById('view-display-name').innerText = data.display_name || data.handle;
            document.getElementById('view-pfp').src = `https://api.dicebear.com/7.x/identicon/svg?seed=${data.handle}`;
            
            // Initial Feed Load
            const { data: allPosts } = await client.from('posts').select('*').order('created_at', { ascending: false });
            const feed = document.getElementById('feed-container');
            feed.innerHTML = '';
            allPosts?.forEach(p => posts.render(p, feed));
        }
    },
    setup: async () => {
        let h = document.getElementById('set-handle').value.trim().toLowerCase();
        if(!h.startsWith('@')) h = '@' + h;
        
        const { error } = await client.from('profiles').upsert({ 
            id: currentSessionUser.id, 
            handle: h,
            is_admin: (currentSessionUser.email === ADMIN_EMAIL)
        });
        
        if (error) toast("Setup error: " + error.message); 
        else location.reload();
    }
};

const posts = {
    create: async () => {
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('link-input').value;
        
        if(!text && !link) return toast("Post is empty!");
        if(!currentSessionUser) return toast("User not authenticated.");

        console.log("Attempting to post...");

        const { data, error } = await client.from('posts').insert([
            {
                user_id: currentSessionUser.id,
                content: text,
                link_url: link
            }
        ]).select();

        if (error) {
            console.error("Post Insert Error:", error);
            toast("Error: " + error.message);
        } else {
            console.log("Post successful:", data);
            toast("Posted!");
            ui.closeModal('post-modal');
            location.reload(); 
        }
    },
    render: (post, container) => {
        const isMod = activeProfile?.is_admin === true;
        const html = `
            <div class="post-card" id="post-${post.id}" style="border:1px solid #eee; padding:15px; margin-bottom:10px; border-radius:15px; position:relative;">
                ${isMod ? `<button onclick="admin.deletePost('${post.id}')" style="position:absolute; right:10px; top:10px; color:red; border:none; background:none; cursor:pointer;">DELETE</button>` : ''}
                <p>${post.content}</p>
                ${post.link_url ? `<a href="${post.link_url}" target="_blank" style="color:blue;">${post.link_url}</a>` : ''}
                <div style="margin-top:10px; font-size:12px;">
                    <button onclick="posts.toggleAction('${post.id}', 'likes')">❤️ Like</button>
                    <button onclick="posts.toggleAction('${post.id}', 'saved_posts')">🔖 Save</button>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    },
    toggleAction: async (postId, table) => {
        const { data: existing } = await client.from(table).select('*').eq('post_id', postId).eq('user_id', currentSessionUser.id).maybeSingle();
        if(existing) {
            await client.from(table).delete().eq('post_id', postId).eq('user_id', currentSessionUser.id);
            toast("Removed");
        } else {
            await client.from(table).insert({ post_id: postId, user_id: currentSessionUser.id });
            toast("Saved!");
        }
    }
};

const admin = {
    deletePost: async (postId) => {
        if(!confirm("Delete this post?")) return;
        const { error } = await client.from('posts').delete().eq('id', postId);
        if(!error) {
            document.getElementById(`post-${postId}`).remove();
            toast("Deleted.");
        }
    }
};

const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const { error } = (type === 'signup') 
            ? await client.auth.signUp({email, password}) 
            : await client.auth.signInWithPassword({email, password});
        
        if (error) toast(error.message);
        else if (type === 'signup') toast("Check your email!");
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
