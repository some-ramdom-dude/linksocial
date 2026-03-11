// --- 1. CONFIGURATION ---
// You will plug your new Supabase Project URL and Anon Key in here later.
const SB_URL = 'YOUR_NEW_SUPABASE_URL';
const SB_KEY = 'YOUR_NEW_SUPABASE_ANON_KEY';
const client = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;

// --- 2. UI CONTROLLER ---
const ui = {
    toggleModal: (id, show) => {
        document.getElementById(id).classList.toggle('active', show);
    },
    showScreen: (screenId) => {
        ['login-ui', 'onboarding-ui', 'feed-ui'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    },
    updateNav: (isLoggedIn) => {
        document.getElementById('nav-post-btn').classList.toggle('hidden', !isLoggedIn);
        document.getElementById('nav-logout-btn').classList.toggle('hidden', !isLoggedIn);
    }
};

// --- 3. AUTHENTICATION & PROFILES ---
const auth = {
    checkSession: async () => {
        const { data: { user } } = await client.auth.getUser();
        currentUser = user;
        
        if (user) {
            ui.updateNav(true);
            // Check if they have a completed profile
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
            posts.fetchFeed(); // Optional: show feed to public without logging in
        }
    },
    
    login: async () => {
        const email = document.getElementById('email-input').value;
        if (!email) return alert("Please enter an email.");
        const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
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

        const { error } = await client.from('profiles').insert({ 
            id: currentUser.id, 
            username, 
            display_name, 
            avatar_url 
        });

        if (error) alert("That handle might be taken, or there was an error.");
        else location.reload();
    }
};

// --- 4. POSTS & REPORTING ---
const posts = {
    undoTimer: null,
    pendingData: null,

    fetchFeed: async () => {
        // We use inner join here to ensure posts only show if the author has a profile
        const { data, error } = await client.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
        
        const container = document.getElementById('feed-container');
        if (error || !data || data.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#888; margin-top:40px;'>No posts yet.</p>";
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + p.profiles?.username}" class="avatar">
                    <span class="post-author">${p.profiles?.display_name || p.profiles?.username}</span>
                    <span class="post-handle">@${p.profiles?.username}</span>
                    <span class="report-flag" onclick="posts.report('${p.id}')">🚩</span>
                </div>
                <a href="${p.url}" target="_blank" class="post-title">🔗 ${p.title}</a>
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
        
        // Hide modal, show toast, start timer
        ui.toggleModal('post-modal', false);
        document.getElementById('undo-toast').classList.remove('hidden');

        posts.undoTimer = setTimeout(async () => {
            await client.from('posts').insert([posts.pendingData]);
            document.getElementById('undo-toast').classList.add('hidden');
            
            // Clear inputs and refresh feed
            document.getElementById('post-title').value = '';
            document.getElementById('post-url').value = '';
            document.getElementById('post-desc').value = '';
            posts.fetchFeed();
        }, 5000);
    },

    cancelPublish: () => {
        clearTimeout(posts.undoTimer);
        document.getElementById('undo-toast').classList.add('hidden');
        ui.toggleModal('post-modal', true); // Re-open so they don't lose their typing
    },

    report: async (targetId) => {
        const reason = prompt("Why are you reporting this?");
        if (!reason) return;
        
        const reporterId = currentUser ? currentUser.id : null;
        await client.from('reports').insert([{ reporter_id: reporterId, target_id: targetId, reason }]);
        alert("Report submitted for review.");
    }
};

// --- 5. INITIALIZE ---
// Run this when the page loads
auth.checkSession();
