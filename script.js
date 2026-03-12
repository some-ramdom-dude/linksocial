const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "ecfriendsclub@gmail.com";
let sessionUser = null;
let profileData = null;

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
    }
};

const profile = {
    load: async (user) => {
        sessionUser = user;
        const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (error || !data) {
            // Logic for onboarding if profile missing
            const h = prompt("Pick a handle (e.g., @ellie):");
            if(h) {
                await client.from('profiles').upsert({ id: user.id, handle: h, is_admin: (user.email === ADMIN_EMAIL) });
                location.reload();
            }
        } else {
            profileData = data;
            document.getElementById('current-user-handle-display').innerText = data.handle;
            document.getElementById('view-handle').innerText = data.handle;
            document.getElementById('view-pfp').src = `https://api.dicebear.com/7.x/identicon/svg?seed=${data.handle}`;
            
            // Load Feed
            const { data: allPosts } = await client.from('posts').select('*').order('created_at', { ascending: false });
            const feed = document.getElementById('feed-container');
            feed.innerHTML = '';
            allPosts?.forEach(p => posts.render(p, feed));
        }
    }
};

const posts = {
    create: async () => {
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('link-input').value;
        if(!text) return toast("Type something first!");

        const { error } = await client.from('posts').insert([{
            user_id: sessionUser.id,
            content: text,
            link_url: link
        }]);

        if (error) toast(error.message);
        else location.reload();
    },
    render: (post, container) => {
        const isMod = profileData?.is_admin === true;
        const html = `
            <div class="post-card" id="post-${post.id}">
                ${isMod ? `<button class="mod-delete" onclick="admin.deletePost('${post.id}')">DELETE</button>` : ''}
                <div style="font-size: 13px; font-weight: 700; color: #888;">Post</div>
                <p>${post.content}</p>
                ${post.link_url ? `<a href="${post.link_url}" target="_blank" class="post-link">${post.link_url}</a>` : ''}
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    }
};

const admin = {
    deletePost: async (postId) => {
        if(!confirm("Admin: Remove this post?")) return;
        await client.from('posts').delete().eq('id', postId);
        document.getElementById(`post-${postId}`).remove();
        toast("Deleted by Admin");
    }
};

const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const { error } = (type === 'signup') ? await client.auth.signUp({email, password}) : await client.auth.signInWithPassword({email, password});
        if (error) toast(error.message);
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
