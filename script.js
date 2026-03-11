const SB_URL = 'https://jekgyjnftijxikhvvmeq.supabase.co';
const SB_KEY = 'sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo';
const client = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;

const ui = {
    showScreen: (id) => {
        ['login-ui', 'onboarding-ui', 'feed-ui'].forEach(s => document.getElementById(s)?.classList.add('hidden'));
        document.getElementById(id)?.classList.remove('hidden');
    },
    toggleModal: (id, show) => document.getElementById(id)?.classList.toggle('active', show),
    updateNav: (isLoggedIn) => {
        document.getElementById('nav-post-btn')?.classList.toggle('hidden', !isLoggedIn);
        document.getElementById('nav-logout-btn')?.classList.toggle('hidden', !isLoggedIn);
    },
    notify: (msg) => {
        const t = document.getElementById('status-toast');
        const m = document.getElementById('status-msg');
        if (!t || !m) return;
        m.innerText = msg.toUpperCase();
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 4000);
    }
};

const auth = {
    checkSession: async () => {
        const { data: { user } } = await client.auth.getUser();
        currentUser = user;
        if (user) {
            ui.updateNav(true);
            const { data: prof } = await client.from('profiles').select('*').eq('id', user.id).single();
            if (!prof?.username) ui.showScreen('onboarding-ui');
            else { ui.showScreen('feed-ui'); posts.fetchFeed(); }
        } else {
            ui.updateNav(false);
            ui.showScreen('login-ui');
            posts.fetchFeed();
        }
    },
    login: async () => {
        const email = document.getElementById('email-input').value;
        if (!email) return ui.notify("Enter Email");
        const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) ui.notify(error.message);
        else ui.notify("Check Email");
    },
    logout: async () => {
        await client.auth.signOut();
        location.reload();
    },
    saveProfile: async () => {
        const handle = document.getElementById('set-handle').value.trim();
        const name = document.getElementById('set-display-name').value.trim();
        const pfp = document.getElementById('set-pfp').value.trim();
        if (!handle) return ui.notify("Handle Required");
        const { error } = await client.from('profiles').upsert({ id: currentUser.id, username: handle, display_name: name, avatar_url: pfp });
        if (error) ui.notify("Error Saving");
        else location.reload();
    }
};

const posts = {
    timer: null,
    pending: null,
    fetchFeed: async () => {
        const { data } = await client.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
        const container = document.getElementById('feed-container');
        if (!container) return;
        if (!data || data.length === 0) return container.innerHTML = "<p style='text-align:center; color:grey;'>NO POSTS</p>";
        container.innerHTML = data.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + p.profiles?.username}" class="avatar">
                    <span class="post-author">${p.profiles?.display_name || p.profiles?.username || 'ANON'}</span>
                </div>
                <a href="${p.url}" target="_blank" class="post-title">${p.title}</a>
                <p style="color:grey; font-size:0.9rem;">${p.description || ''}</p>
            </div>
        `).join('');
    },
    publish: () => {
        const title = document.getElementById('post-title').value;
        const url = document.getElementById('post-url').value;
        if (!title || !url) return ui.notify("Fill Required Fields");
        posts.pending = { user_id: currentUser.id, title, url, description: document.getElementById('post-desc').value };
        ui.toggleModal('post-modal', false);
        document.getElementById('undo-toast').classList.remove('hidden');
        posts.timer = setTimeout(async () => {
            await client.from('posts').insert([posts.pending]);
            document.getElementById('undo-toast').classList.add('hidden');
            ui.notify("Published");
            posts.fetchFeed();
        }, 5000);
    },
    cancelPublish: () => {
        clearTimeout(posts.timer);
        document.getElementById('undo-toast').classList.add('hidden');
        ui.toggleModal('post-modal', true);
        ui.notify("Cancelled");
    }
};

auth.checkSession();
