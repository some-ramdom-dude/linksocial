// 1. INITIALIZE SUPABASE
const SUPABASE_URL = "https://jekgyjnftijxikhvvmeq.supabase.co";
const SUPABASE_KEY = "sb_publishable_FCVlQet25kUFQzX4OTONcQ_dytr_YJo";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. UI CONTROLS
const ui = {
    notify: (msg) => {
        const toast = document.getElementById('notification');
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    },
    toggleView: (isLoggedIn) => {
        document.getElementById('login-ui').classList.toggle('hidden', isLoggedIn);
        document.getElementById('main-ui').classList.toggle('hidden', !isLoggedIn);
    }
};

// 3. AUTH LOGIC
const auth = {
    handleAuth: async (type) => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        if (!email || !password) return ui.notify("PLEASE FILL ALL FIELDS");

        const { data, error } = (type === 'signup') 
            ? await client.auth.signUp({ email, password })
            : await client.auth.signInWithPassword({ email, password });

        if (error) ui.notify(error.message.toUpperCase());
        else if (type === 'signup') ui.notify("ACCOUNT CREATED! LOG IN NOW.");
    },

    loginWithGoogle: async () => {
        ui.notify("REDIRECTING TO GOOGLE...");
        const { error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) ui.notify(error.message.toUpperCase());
    },

    logout: async () => {
        await client.auth.signOut();
        location.reload();
    }
};

// 4. SESSION CHECK (Keeps user logged in on refresh)
client.auth.onAuthStateChange((event, session) => {
    if (session) {
        ui.toggleView(true);
        document.getElementById('user-greeting').innerText = `Welcome, ${session.user.email}`;
    } else {
        ui.toggleView(false);
    }
});
