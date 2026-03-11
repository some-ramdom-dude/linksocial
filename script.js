// --- 1. CONFIGURATION ---
const SB_URL = 'https://jekgyjnftijxikhvvmeq.supabase.co';
const SB_KEY = 'sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo';
const client = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;

// --- 2. UI CONTROLLER ---
const ui = {
    showScreen: (screenId) => {
        ['login-ui', 'onboarding-ui', 'feed-ui'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById(screenId)?.classList.remove('hidden');
    },

    toggleModal: (id, show) => {
        document.getElementById(id)?.classList.toggle('active', show);
    },

    updateNav: (isLoggedIn) => {
        document.getElementById('nav-post-btn')?.classList.toggle('hidden', !isLoggedIn);
        document.getElementById('nav-logout-btn')?.classList.toggle('hidden', !isLoggedIn);
    },

    notify: (msg, duration = 4000) => {
        const toast = document.getElementById('status-toast');
        const msgEl = document.getElementById('status-msg');
        if (!toast || !msgEl) return;
        
        msgEl.innerText = msg.toUpperCase();
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }
};

// --- 3. AUTHENTICATION & PROFILES ---
const auth = {
    checkSession: async () => {
        const { data: { user } } = await client.auth.getUser();
        currentUser = user;

        if (user) {
            ui.updateNav(true);
            const { data: profile } = await client.from('profiles').select('*').eq('id', user.id).single();

            if (!profile || !profile.username) {
                ui.showScreen('onboarding-ui');
            } else {
                ui.showScreen('feed-ui');
                posts.fetchFeed();
            }
        } else {
            ui.updateNav(false);
            ui.showScreen('login-ui');
            posts.fetchFeed();
        }
    },

    login: async () => {
        const email = document.getElementById('email-input').value;
        if (!email) return ui.notify("Email Required");

        const { error } = await client.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.href }
        });

        if (error) ui.notify(error.message);
        else ui.notify("Check your inbox for the link");
    },

    logout: async () => {
        await client.auth.signOut();
        window.location.reload();
    },

    saveProfile: async () => {
        const handle = document.getElementById('set-handle').value.trim();
        const name = document.getElementById('set-display-name').value.trim();
        const pfp = document.getElementById('set-pfp').value.trim();

        if (!handle) return ui.notify("Handle is required");

        const { error } = await client.from('profiles').upsert({ 
            id: currentUser.id, username: handle, display_name: name, avatar_url: pfp 
        });

        if (error) ui.notify("Handle taken or error occurred");
        else window.location.reload();
    }
};

// --- 4. POSTS & FEED ---
const posts = {
    undoTimer: null,
    pendingData: null,

    fetchFeed: async () => {
        const { data, error } = await client.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
        const container = document.getElementById('feed-container');
        if (!container) return;

        if (error || !data || data.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#888; padding-top:50px;'>NO ENTRIES YET</p>";
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + p.user_id}" class="avatar">
                    <span class="post-author">${p.profiles?.display_name || p.profiles?.username || 'ANONYMOUS'}</span>
                    <span class="post-handle">@${p.profiles?.username || 'anon'}</span>
                    <span class="report-flag" onclick="posts.report('${p.id}')">🚩</span>
                </div>
                <a href="${p.url}" target="_blank" class="post-title">${p.title}</a>
                <p class="post-desc">${p.description || ''}</p>
            </div>
        `).join('');
    },

    publish: () => {
        const title = document.getElementById('post-title').value;
        const url = document.getElementById('post-url').value;
        const desc = document.getElementById('post-desc').value;

        if (!title || !url) return ui.notify("Title and URL required");

        posts.pendingData = { user_id: currentUser.id, title, url, description: desc };
        ui.toggleModal('post-modal', false);
        document.getElementById('undo-toast').classList.remove('hidden');

        posts.undoTimer = setTimeout(async () => {
            const { error } = await client.from('posts').insert([posts.pendingData]);
            document.getElementById('undo-toast').classList.add('hidden');
            if (error) ui.notify(error.message);
            else {
                ui.notify("Published successfully");
                posts.fetchFeed();
            }
            document.getElementById('post-title').value = '';
            document.getElementById('post-url').value = '';
            document.getElementById('post-desc').value = '';
        }, 5000);
    },

    cancelPublish: () => {
        clearTimeout(posts.undoTimer);
        document.getElementById('undo-toast').classList.add('hidden');
        ui.toggleModal('post-modal', true);
        ui.notify("Publishing Cancelled");
    },

    report: async (postId) => {
        const reason = prompt("Reason for reporting?");
        if (!reason) return;

        const { error } = await client.from('reports').insert([{
            reporter_id: currentUser?.id || null,
            target_id: postId,
            reason
        }]);

        if (error) ui.notify("Reporting failed");
        else ui.notify("Report submitted for review");
    }
};

// --- 5. START ---
auth.checkSession();
