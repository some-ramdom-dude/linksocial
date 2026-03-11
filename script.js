const SUPABASE_URL = "YOUR_URL";
const SUPABASE_KEY = "YOUR_KEY";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAIL = "your-email@gmail.com"; // Change this to your email to see Admin button

const ui = {
    openModal: (id) => document.getElementById(id).classList.remove('hidden'),
    closeModal: (id) => document.getElementById(id).classList.add('hidden'),
    updateUI: (session) => {
        const loginUI = document.getElementById('login-ui');
        const mainUI = document.getElementById('main-ui');
        const modBtn = document.getElementById('mod-btn');

        if (session) {
            loginUI.classList.add('hidden');
            mainUI.classList.remove('hidden');
            document.getElementById('display-name').innerText = session.user.email.split('@')[0];
            // Show Admin button only for you
            if(session.user.email === ADMIN_EMAIL) modBtn.classList.remove('hidden');
        } else {
            loginUI.classList.remove('hidden');
            mainUI.classList.add('hidden');
        }
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
            options: { redirectTo: window.location.origin } 
        });
    },
    logout: async () => {
        await client.auth.signOut();
        // UI will update automatically via onAuthStateChange
    }
};

const profile = {
    save: () => {
        const name = document.getElementById('name-edit').value;
        const icon = document.getElementById('icon-edit').value;
        if(name) document.getElementById('display-name').innerText = name;
        if(icon) document.getElementById('display-icon').src = icon;
        ui.closeModal('profile-modal');
    }
};

const mod = {
    banUser: () => {
        const email = document.getElementById('ban-email').value;
        alert("Moderation request sent for: " + email);
        // This requires a Supabase Edge Function to actually delete users from Auth
        ui.closeModal('mod-modal');
    }
};

// Initial Session Load
client.auth.onAuthStateChange((event, session) => {
    ui.updateUI(session);
});
