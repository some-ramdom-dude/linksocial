const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "ecfriendsclub@gmail.com"; // PLZ Dont Email me!
let savedLinks = JSON.parse(localStorage.getItem('ls_library')) || [];

// Toast Notification System
function toast(message) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = message;
    container.appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 300); 
    }, 3000);
}

const ui = {
    openModal: (id) => document.getElementById(id).classList.remove('hidden'),
    closeModal: (id) => document.getElementById(id).classList.add('hidden'),
    handleSearch: (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.replace('@', '');
            window.location.search = `?u=${query}`;
        }
    },
    toggleLibrary: () => {
        const lib = document.getElementById('library-view');
        lib.classList.toggle('hidden');
        ui.renderLibrary();
    },
    renderLibrary: () => {
        const container = document.getElementById('library-container');
        container.innerHTML = savedLinks.length ? '' : '<p style="font-size:11px;color:#bbb;text-align:center">No saved links in your library.</p>';
        savedLinks.forEach(link => {
            container.innerHTML += `<div class="post-link-preview"><a href="${link}" target="_blank" style="text-decoration:none;color:#000;">${link}</a></div>`;
        });
    },
    updateUI: (session) => {
        if (session) {
            document.getElementById('login-ui').classList.add('hidden');
            document.getElementById('main-ui').classList.remove('hidden');
            profile.load(session.user);
        } else {
            document.getElementById('login-ui').classList.remove('hidden');
            document.getElementById('main-ui').classList.add('hidden');
        }
    }
};

const profile = {
    load: async (user) => {
        const { data } = await client.from('profiles').select('*').eq('id', user.id).single();
        if (!data) {
            ui.openModal('onboarding-modal');
        } else {
            document.getElementById('current-user-handle').innerText = data.handle;
            document.getElementById('edit-handle').value = data.handle;
            profile.checkCooldown(data.last_handle_change);
        }
    },
    checkCooldown: (lastChange) => {
        const nextAvailable = new Date(new Date(lastChange).getTime() + (7 * 24 * 60 * 60 * 1000));
        const diff = Math.ceil((nextAvailable - Date.now()) / (1000 * 60 * 60 * 24));
        const notice = document.getElementById('handle-cooldown');
        const input = document.getElementById('edit-handle');
        
        if (diff > 0) {
            notice.innerText = `Handle Locked for ${diff} days`;
            input.disabled = true;
        } else {
            notice.innerText = `Handle change available`;
            input.disabled = false;
        }
    },
    setup: async () => {
        const user = (await client.auth.getUser()).data.user;
        let h = document.getElementById('set-handle').value.trim().toLowerCase();
        
        if(!h.startsWith('@')) h = '@' + h;
        if(h.length < 4) return toast("Handle too short!");

        // CHECK IF HANDLE IS TAKEN BY SOMEONE ELSE
        const { data: existing } = await client.from('profiles').select('id').eq('handle', h).single();
        if (existing && existing.id !== user.id) {
            return toast("Handle already taken!");
        }

        const { error } = await client.from('profiles').upsert({ id: user.id, handle: h }, { onConflict: 'id' });
        
        if (error) toast("Error claiming handle.");
        else { toast("Handle Claimed!"); location.reload(); }
    },
    update: async () => {
        const user = (await client.auth.getUser()).data.user;
        let h = document.getElementById('edit-handle').value.trim().toLowerCase();
        if(!h.startsWith('@')) h = '@' + h;

        const { error } = await client.from('profiles').update({ 
            handle: h,
            display_name: document.getElementById('edit-display-name').value
        }).eq('id', user.id);

        if (error) toast(error.message);
        else { toast("Profile updated!"); location.reload(); }
    }
};

const posts = {
    create: async () => {
        const user = (await client.auth.getUser()).data.user;
        const { data: prof } = await client.from('profiles').select('is_verified').eq('id', user.id).single();
        const isAdmin = user.email === ADMIN_EMAIL;
        
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('link-input').value;
        const handle = document.getElementById('current-user-handle').innerText;

        const postHTML = `
            <div class="post-card">
                ${isAdmin ? `<button style="position:absolute;top:15px;right:15px;background:none;border:none;color:red;cursor:pointer;font-size:10px;font-weight:bold;" onclick="this.parentElement.remove()">DELETE</button>` : ''}
                <div class="post-header">
                    <strong>${handle}</strong>
                    ${prof?.is_verified ? '<span class="verified-badge">✔</span>' : ''}
                </div>
                <p>${text.replace(/#(\w+)/g, '<span style="color:#0066ff">#$1</span>')}</p>
                ${link ? `<a href="${link}" target="_blank" class="post-link-preview">${link}</a>` : ''}
                <div class="post-actions">
                    <span class="action-item" onclick="this.innerText = '❤️ 1'">❤️ 0</span>
                    <span class="action-item" onclick="posts.save('${link}')">🔖 Save</span>
                </div>
            </div>`;
        
        document.getElementById('feed-container').insertAdjacentHTML('afterbegin', postHTML);
        document.getElementById('post-text').value = '';
        document.getElementById('link-input').value = '';
        toast("Post live!");
    },
    save: (link) => {
        if(!link) return toast("No link to save!");
        if(!savedLinks.includes(link)) {
            savedLinks.push(link);
            localStorage.setItem('ls_library', JSON.stringify(savedLinks));
            toast("Saved to your library!");
        } else {
            toast("Already in library.");
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
        else toast(type === 'signup' ? "Check your email!" : "Welcome back!");
    },
    loginWithGoogle: async () => {
        await client.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { redirectTo: window.location.origin + window.location.pathname } 
        });
    },
    logout: async () => { await client.auth.signOut(); location.reload(); }
};

client.auth.onAuthStateChange((event, session) => {
    if (window.location.hash) window.history.replaceState(null, null, window.location.pathname);
    ui.updateUI(session);
});
