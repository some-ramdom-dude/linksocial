// --- 1. CONFIGURATION ---
const SB_URL = 'https://jekgyjnftijxikhvvmeq.supabase.co';
const SB_KEY = 'sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo';

// Initialize Supabase
const client = supabase.createClient(SB_URL, SB_KEY);
let currentUser = null;

// --- 2. UI CONTROLLER ---
const ui = {
    toggleModal: (id, show) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', show);
    },
    showScreen: (screenId) => {
        ['login-ui', 'onboarding-ui', 'feed-ui'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        if (target) target.classList.remove('hidden');
    },
    updateNav: (isLoggedIn) => {
        const postBtn = document.getElementById('nav-post-btn');
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (postBtn) postBtn.classList.toggle('hidden', !isLoggedIn);
        if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);
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
        if (!email) return alert("Please enter an email.");
        const { error } = await client.auth.signInWithOtp({ 
            email, 
            options: { emailRedirectTo: window.location.href } 
        });
        if (error) alert(error.message);
        else alert("Magic link sent! Check your inbox.");
    },

    logout: async () => {
        await client.auth.signOut();
        location.reload();
    },

    saveProfile: async () => {
        if (!currentUser) return;
        const username = document.getElementById('set-handle').value.trim();
        const display_name = document.getElementById('set-display-name').value.trim();
        const avatar_url = document.getElementById('set-pfp').value.trim();
        
        if (!username) return alert("Handle is required.");

        const { error } = await client.from('profiles').upsert({ 
            id: currentUser.id, 
            username, 
            display_name, 
            avatar_url 
        });

        if (error) alert("Error saving profile: " + error.message);
        else location.reload();
    }
};

// --- 4. POSTS & REPORTING ---
const posts = {
    undoTimer: null,
    pendingData: null,

    fetchFeed: async () => {
        const { data, error } = await client.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
        const container = document.getElementById('feed-container');
        if (!container) return;

        if (error || !data || data.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#888; margin-top:40px;'>No posts yet.</p>";
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (p.profiles?.username || 'anon')}" class="avatar" style="width:32px;height:32px;border-radius:50%">
                    <span class="post-author"><b>${p.profiles?.display_name || p.profiles?.username || 'Anonymous'}</b></span>
                    <span class="post-handle">@${p.profiles?.username || 'anon'}</span>
                    <span class="report-flag" style="cursor:pointer;margin-left:auto" onclick="posts.report('${p.id}')">🚩</span>
                </div>
                <a href="${p.url}" target="_blank" class="post-title" style="display:block;margin:10px 0;text-decoration:none;color:black;font-weight:bold">🔗 ${p.title}</a>
                <p class="post-desc">${p.description || ''}</p>
            </div>
        `).join('');
    },

    publish: () => {
        if (!currentUser) return alert("You must be logged in to post.");
        const title = document.getElementById('post-title').value;
        const url = document.getElementById('post-url').value;
        const description = document.getElementById('post-desc').value;
        
        if (!title || !url) return alert("Title and URL are required.");

        posts.pendingData = { user_id: currentUser.id, title, url, description };
        ui.toggleModal('post-modal', false);
        document.getElementById('undo-toast').classList.remove('hidden');

        posts.undoTimer = setTimeout(async () => {
            const { error } = await client.from('posts').insert([posts.pendingData]);
            if (error) alert(error.message);
            document.getElementById('undo-toast').classList.add('hidden');
            posts.fetchFeed();
        }, 5000);
    },

    cancelPublish: () => {
        clearTimeout(posts.undoTimer);
        document.getElementById('undo-toast').classList.add('hidden');
        ui.toggleModal('post-modal', true);
    },

    report: async (targetId) => {
        const reason = prompt("Why are you reporting this?");
        if (!reason) return;
        const { error } = await client.from('reports').insert([{ 
            reporter_id: currentUser?.id, 
            target_id: targetId, 
            reason 
        }]);
        if (error) alert(error.message);
        else alert("Report submitted.");
    }
};

// --- 5. INITIALIZE ---
auth.checkSession();
