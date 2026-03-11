const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ADD THIS LINE HERE:
const ADMIN_EMAIL = "ecfriendsclub@gmail.com";

const ui = {
    openModal: (id) => document.getElementById(id).classList.remove('hidden'),
    closeModal: (id) => document.getElementById(id).classList.add('hidden'),
    handleSearch: (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.replace('@', '');
            window.location.search = `?u=${query}`;
        }
    },
    updateUI: (session) => {
        const loginUI = document.getElementById('login-ui');
        const mainUI = document.getElementById('main-ui');
        if (session) {
            loginUI.classList.add('hidden');
            mainUI.classList.remove('hidden');
            profile.load(session.user);
        } else {
            loginUI.classList.remove('hidden');
            mainUI.classList.add('hidden');
        }
    }
};

const profile = {
    load: async (user) => {
        const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (error || !data) {
            ui.openModal('onboarding-modal');
        } else {
            document.getElementById('current-user-handle').innerText = data.handle;
            document.getElementById('edit-handle').value = data.handle;
            document.getElementById('edit-display-name').value = data.display_name || "";
            document.getElementById('edit-pfp').value = data.avatar_url || "";
            profile.calculateCooldown(data.last_handle_change);
        }
    },

    calculateCooldown: (lastChangeDate) => {
        const last = new Date(lastChangeDate);
        const nextAvailable = new Date(last.getTime() + (7 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const diffDays = Math.ceil((nextAvailable - now) / (1000 * 60 * 60 * 24));
        
        const notice = document.getElementById('handle-cooldown');
        const input = document.getElementById('edit-handle');
        
        if (diffDays > 0) {
            notice.innerText = `Handle locked for ${diffDays} more days`;
            input.disabled = true;
        } else {
            notice.innerText = `Handle change available`;
            input.disabled = false;
        }
    },

    setup: async () => {
        const user = (await client.auth.getUser()).data.user;
        let handle = document.getElementById('set-handle').value.trim().toLowerCase();
        if (!handle.startsWith('@')) handle = '@' + handle;
        
        const { error } = await client.from('profiles').upsert({ id: user.id, handle: handle });
        if (error) alert("Handle taken or invalid. Try another.");
        else location.reload();
    },

    update: async () => {
        const user = (await client.auth.getUser()).data.user;
        let handle = document.getElementById('edit-handle').value.trim().toLowerCase();
        if (!handle.startsWith('@')) handle = '@' + handle;

        const { error } = await client.from('profiles').update({ 
            handle: handle,
            display_name: document.getElementById('edit-display-name').value,
            avatar_url: document.getElementById('edit-pfp').value
        }).eq('id', user.id);

        if (error) alert(error.message);
        else location.reload();
    }
};

const posts = {
    parse: (text) => {
        return text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
                   .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    },

    create: async () => {
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('link-input').value;
        let domain = "";
        let icon = "";
        
        try {
            if(link) {
                const urlObj = new URL(link);
                domain = urlObj.hostname.replace('www.', '');
                icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            }
        } catch(e) { console.log("Invalid link"); }

        const postHTML = `
            <div class="post-card">
                <div class="post-header">
                    <div class="post-pfp"></div>
                    <strong>${document.getElementById('current-user-handle').innerText}</strong>
                </div>
                <p>${posts.parse(text)}</p>
                ${link ? `<a href="${link}" target="_blank" class="post-link-preview">
                    <img src="${icon}" class="link-icon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22gray%22><path d=%22M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1z%22/></svg>'">
                    <span>${domain}</span>
                </a>` : ''}
                <div style="margin-top:15px; font-size: 13px; color: #666;">❤️ 0 &nbsp; 💬 0</div>
            </div>`;
        document.getElementById('feed-container').insertAdjacentHTML('afterbegin', postHTML);
        document.getElementById('post-text').value = '';
        document.getElementById('link-input').value = '';
    }
};

const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const { error } = (type === 'signup') 
            ? await client.auth.signUp({ email, password })
            : await client.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    },
    loginWithGoogle: async () => {
        await client.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { redirectTo: window.location.origin + window.location.pathname } 
        });
    },
    logout: async () => { await client.auth.signOut(); location.reload(); }
};

// Handle Search Views
const params = new URLSearchParams(window.location.search);
if (params.get('u')) {
    // Logic to show public profile would go here
    console.log("Viewing user: " + params.get('u'));
}

client.auth.onAuthStateChange((event, session) => {
    if (window.location.hash) window.history.replaceState(null, null, window.location.pathname);
    ui.updateUI(session);
});
