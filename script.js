const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ui = {
    notify: (m) => { alert(m); },
    openModal: (id) => document.getElementById(id).classList.remove('hidden'),
    closeModal: (id) => document.getElementById(id).classList.add('hidden'),
    toggleView: (isLoggedIn) => {
        document.getElementById('login-ui').classList.toggle('hidden', isLoggedIn);
        document.getElementById('main-ui').classList.toggle('hidden', !isLoggedIn);
    }
};

const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        const { error } = (type === 'signup') 
            ? await client.auth.signUp({ email, password })
            : await client.auth.signInWithPassword({ email, password });
        if (error) ui.notify(error.message);
    },
    loginWithGoogle: async () => {
        await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    },
    logout: async () => {
        await client.auth.signOut();
        location.reload();
    }
};

const profile = {
    save: async () => {
        const name = document.getElementById('name-edit').value;
        const icon = document.getElementById('icon-edit').value;
        
        // Update local UI
        if(name) document.getElementById('display-name').innerText = name;
        if(icon) document.getElementById('display-icon').src = icon;
        
        ui.closeModal('profile-modal');
        ui.notify("Profile Updated!");
        // Note: Real database saving would go here using client.from('profiles')...
    }
};

client.auth.onAuthStateChange((event, session) => {
    ui.toggleView(!!session);
    if(session) {
        document.getElementById('display-name').innerText = session.user.email.split('@')[0];
    }
});
