// --- 1. CONFIGURATION ---
const SB_URL = 'https://jekgyjnftijxikhvvmeq.supabase.co';
const SB_KEY = 'sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo';
const client = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;

// --- 2. UI CONTROLLER ---
const ui = {
    // Controls which "screen" the user sees
    showScreen: (screenId) => {
        ['login-ui', 'onboarding-ui', 'feed-ui'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        if (target) target.classList.remove('hidden');
    },

    // Toggles pop-up modals
    toggleModal: (id, show) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.toggle('active', show);
    },

    // Updates buttons in the top navigation
    updateNav: (isLoggedIn) => {
        const postBtn = document.getElementById('nav-post-btn');
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (postBtn) postBtn.classList.toggle('hidden', !isLoggedIn);
        if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);
    }
};

// --- 3. AUTHENTICATION & PROFILES ---
const auth = {
    // Runs on page load to see who is logged in
    checkSession: async () => {
        const { data: { user } } = await client.auth.getUser();
        currentUser = user;

        if (user) {
            ui.updateNav(true);
            // Check if user has finished their profile (username check)
            const { data: profile, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!profile || !profile.username) {
                ui.showScreen('onboarding-ui');
            } else {
                ui.showScreen('feed-ui');
                posts.fetchFeed();
            }
        } else {
            ui.updateNav(false);
            ui.showScreen('login-ui');
            posts.fetchFeed(); // Let guests see the feed
        }
    },

    login: async () => {
        const email = document.getElementById('email-input').value;
        if (!email) return alert("Please enter your email.");

        const { error } = await client.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: window.location.href }
        });

        if (error) alert(error.message);
        else alert("Magic link sent! Check your email to log in.");
    },

    logout: async () => {
        await client.auth.signOut();
        window.location.reload();
    },

    saveProfile: async () => {
        const handle = document.getElementById('set-handle').value.trim();
        const name = document.getElementById('set-display-name').value.trim();
        const pfp = document.getElementById('set-pfp').value.trim();

        if (!handle) return alert("A handle is required!");

        const { error } = await client
            .from('profiles')
            .upsert({ 
                id: currentUser.id, 
                username: handle, 
                display_name: name, 
                avatar_url: pfp 
            });

        if (error) {
            console.error(error);
            alert("Error saving profile. That handle might be taken.");
        } else {
            window.location.reload();
        }
    }
};

// --- 4. POSTS & FEED ---
const posts = {
    undoTimer: null,
    pendingData: null,

    fetchFeed: async () => {
        const { data, error } = await client
            .from('posts')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false });

        const container = document.getElementById('feed-container');
        if (error || !data) {
            container.innerHTML = "<p>Failed to load posts.</p>";
            return;
        }

        container.innerHTML = data.map(p => `
            <div class="post">
                <div class="post-header">
                    <img src="${p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + p.user_id}" class="avatar">
                    <span class="post-author">${p.profiles?.display_name || p.profiles?.username || 'Anonymous'}</span>
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

        if (!title || !url) return alert("Title and URL are required.");

        // Store data for the "Undo" window
        posts.pendingData = { 
            user_id: currentUser.id, 
            title: title, 
            url: url, 
            description: desc 
        };

        ui.toggleModal('post-modal', false);
        document.getElementById('undo-toast').classList.remove('hidden');

        // Wait 5 seconds before actually sending to Supabase
        posts.undoTimer = setTimeout(async () => {
            const { error } = await client.from('posts').insert([posts.pendingData]);
            document.getElementById('undo-toast').classList.add('hidden');
            if (error) alert(error.message);
            else posts.fetchFeed();
            
            // Clear the form
            document.getElementById('post-title').value = '';
            document.getElementById('post-url').value = '';
            document.getElementById('post-desc').value = '';
        }, 5000);
    },

    cancelPublish: () => {
        clearTimeout(posts.undoTimer);
        document.getElementById('undo-toast').classList.add('hidden');
        ui.toggleModal('post-modal', true); // Re-open the modal so they can edit
    },

    report: async (postId) => {
        const reason = prompt("Why are you reporting this post?");
        if (!reason) return;

        const { error } = await client.from('reports').insert([{
            reporter_id: currentUser?.id || null,
            target_id: postId,
            reason: reason
        }]);

        if (error) alert("Report failed.");
        else alert("Report submitted. Our AI will review this shortly.");
    }
};

// --- 5. INIT ---
auth.checkSession();
