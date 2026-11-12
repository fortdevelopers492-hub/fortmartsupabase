/**
 * ------------------------------------------------------------------
 * 1. SUPABASE INITIALIZATION (Lazy & Safe)
 * ------------------------------------------------------------------
 */
const SUPABASE_URL = 'https://ihuhkwttcdtqhnyiqfbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Opj9kLRtDMLctX1rsOPngg_9wzVSILs';

let _supabaseInstance = null;

function getSupabaseClient() {
    if (_supabaseInstance) return _supabaseInstance;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
        _supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase CDN script is not loaded or available yet.");
    }
    
    return _supabaseInstance;
}

/**
 * Fort Mart Core Single-Page Application Application State Machine Archetype
 */

// Global App State Data Layer Initialization
let APP_STATE = {
    deviceMode: 'laptop', // runtime options: 'laptop' | 'phone'
    currentUser: null,    // operational profile object reference mapping
    activeViewPage: 'home',
    navbarExpanded: true,
    categoryDrawerOpen: false,
    currentSelectedCategory: 'Trending',
    searchQuery: '',
    chatConfiguration: {
        notificationsEnabled: true,
        autoReplyEnabled: false,
        autoReplyMessageText: "Thank you for contacting us. We will evaluate your query and message you shortly.",
        autoDownloadEnabled: false
    },
    activeChatTargetUserHash: null,
    selectedMessageNodesCollection: [],
    fortAiActiveTaggedProductObject: null
};

// Platform Default Core Mock Database Entities Baseline Arrays 
let SYSTEM_DATABASE = {
    users: [],
    products: [],
    chats: [],
    platformFeedback: [],
    networkSuiteEntities: []
};

// Ensure leaderboard array structure exists within system storage layers
if (!SYSTEM_DATABASE.pinnedLeaderboard) {
    SYSTEM_DATABASE.pinnedLeaderboard = []; // Max 20 slots containing product 'pid' strings
}

/**
 * Utility Helper: Sets a browser cookie
 */
/**
 * Sets a secure browser cookie optimized for HTTPS, HTTP, and local filesystem environments
 */
function setSecureAuthCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    
    const protocol = window.location.protocol;
    
    // Base configuration parameters
    let cookieString = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    
    if (protocol === "https:") {
        // Enforce maximum production security requirements over encrypted HTTPS networks
        cookieString += "; Secure; SameSite=Strict";
        document.cookie = cookieString;
    } else if (protocol === "http:") {
        // Relax strict policies for standard unencrypted local development servers (http://localhost)
        cookieString += "; SameSite=Lax";
        document.cookie = cookieString;
    } else {
        // file:// or other protocols do not support setting cookies; log a silent note
        console.warn("Cookies are not supported on the current protocol context:", protocol);
    }
}

function getSecureAuthCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

/**
 * Utility Helper: Deletes a browser cookie
 */
function eraseSecureAuthCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
}

/**
 * Persists and commits state updates across database abstraction wrappers
 */
function administrativeSaveAndRefreshDisplay(activeProductId = null) {
    if (typeof syncPlatformDatabaseStateToWebStorage === "function") {
        syncPlatformDatabaseStateToWebStorage();
    } else if (typeof commitDatabasesStateToLocalStorage === "function") {
        commitDatabasesStateToLocalStorage();
    }
    
    // Refresh display elements instantly
    renderMarketplaceProductsDisplayLoop();
    
    // Re-render open modal windows to accurately update contextual status layouts
    if (activeProductId) {
        launchComprehensiveProductSpecificationsExpandedModalView(activeProductId);
    }
}

/**
 * Helper function to upload base64, data URLs, or File objects to Supabase Storage bucket 'user-avatars'
 * Fully safe for both file:/// and https:// protocols.
 */
async function uploadAvatarToSupabaseStorage(fileOrBase64, filenamePrefix = 'avatar') {
    if (!fileOrBase64) return "";
    
    const client = getSupabaseClient();
    if (!client) {
        console.error("Supabase client could not be initialized.");
        return "";
    }

    let fileBody = fileOrBase64;

    // Convert string inputs (Base64 / Data URLs) to Blob natively (works on file:/// and https://)
    if (typeof fileOrBase64 === 'string') {
        try {
            let base64Data = fileOrBase64;
            let contentType = 'image/png';

            if (fileOrBase64.startsWith('data:')) {
                const parts = fileOrBase64.split(';');
                contentType = parts[0].replace('data:', '');
                const base64Part = parts.find(p => p.startsWith('base64,'));
                if (base64Part) {
                    base64Data = base64Part.replace('base64,', '');
                }
            }

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            fileBody = new Blob([byteArray], { type: contentType });
        } catch (err) {
            console.error("Failed to parse base64 string:", err);
            return "";
        }
    }
    
    const filePath = `avatars/${filenamePrefix}_${Date.now()}.png`;

    try {
        // Wrap the Supabase network call in a timeout promise (10 seconds max) 
        const uploadPromise = client.storage
            .from('user-avatars')
            .upload(filePath, fileBody, {
                contentType: 'image/png',
                upsert: true
            });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase storage upload timed out.")), 10000)
        );

        const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

        if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError.message);
            return "";
        }

        const { data: publicUrlData } = client.storage
            .from('user-avatars')
            .getPublicUrl(filePath);

        return publicUrlData ? publicUrlData.publicUrl : "";

    } catch (err) {
        console.error("Upload process failed or timed out:", err.message);
        return "";
    }
}

// Local Storage Baseline State Synchronization Functions
/**
 * ------------------------------------------------------------------
 * PLATFORM DATABASE STATE SYNCHRONIZATION (SUPABASE MIGRATION)
 * ------------------------------------------------------------------
 */

// Save or sync platform database states to Supabase tables
async function syncPlatformDatabaseStateToWebStorage() {
    // If you are managing user states, sync the current active user or records to Supabase.
    // For general local fallback, you can still keep a small localStorage marker if needed:
    localStorage.setItem("FORT_MART_DB_SYNCHRONIZED", "true");
}

// Load platform database state asynchronously from Supabase tables
async function loadPlatformDatabaseStateFromWebStorage() {
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        return;
    }

    try {
        // Fetch users table from Supabase using the local 'db' client
        const { data: usersData, error: usersError } = await db
            .from('users')
            .select('*');

        if (usersError) {
            console.error("Error loading users from Supabase:", usersError.message);
            return;
        }

        if (usersData) {
            // Map database records back to your SYSTEM_DATABASE structure
            SYSTEM_DATABASE.users = usersData.map(record => ({
                ...record,
                identityName: record.identity_name,
                accountType: record.account_type,
                dialingCode: record.dialing_code,
                identifierText: record.identifier_text,
                secretKey: record.secret_key,
                businessName: record.business_name,
                businessInfo: record.business_info
            }));
        }

        // Optional: add additional table fetches here as your app scales
        // const { data: productsData } = await db.from('products').select('*');
        // if (productsData) { SYSTEM_DATABASE.products = productsData; }

    } catch (err) {
        console.error("Unexpected error loading state from Supabase:", err);
    }
}

// System Init Bootstrap Hooks Lifecycle Engine Activation Loop
window.addEventListener("DOMContentLoaded", () => {
    // 1. MUST LOAD CACHED COPIES FIRST
    loadPlatformDatabaseStateFromWebStorage();
    
    // 2. INTERCEPT IMMEDIATELY (Move this up so it blocks unauthorized views instantly)
    if (typeof triggerAuthenticationModalSequence === 'function') {
        triggerAuthenticationModalSequence();
    }

    // 3. RUN BACKGROUND LIFECYCLE CHECKS
    if (typeof executeSystemicSubscriptionExpirationLifecycleCheck === 'function') {
        executeSystemicSubscriptionExpirationLifecycleCheck();
    }
    
    // 4. RUN RENDER LOOPS LAST (Only works on prepared data for authenticated states)
    if (typeof renderMarketplaceProductsDisplayLoop === 'function') {
        renderMarketplaceProductsDisplayLoop();
    }
    if (typeof buildCategoryRibbonFilterInterfaceElements === 'function') {
        buildCategoryRibbonFilterInterfaceElements();
    }
    if (typeof populateNetworkSuiteExtensionsDisplayView === 'function') {
        populateNetworkSuiteExtensionsDisplayView();
    }
});

/**
 * Structural Architecture, Layout & View Rendering Module Engines
 */
function toggleSideDrawer() {
    const drawerNode = document.getElementById("side-drawer");
    
    // Check screen width instead of a manual state
    if (window.innerWidth <= 1024) {
        drawerNode.classList.toggle("active-phone-drawer");
    } else {
        drawerNode.classList.toggle("closed");
    }
}

// Close phone responsive side layouts drawer automatically upon completion
if (window.innerWidth <= 1024) {
    const sideDrawer = document.getElementById("side-drawer");
    if (sideDrawer) sideDrawer.classList.remove("active-phone-drawer");
}

// Mapping table for page titles
const PAGE_TITLES = {
    'home': 'Home | Fort Mart',
    'messages': 'Messages | Fort Mart',
    'prompt-workspace-aipage': 'Fort AI Assitant | Fort Mart',
    'my-account': 'My Account | Fort Mart',
    'admin-dashboard': 'Admin Dashboard | Fort Mart'
};

function navigateToPage(targetPageId) {
    // Intercept Gate: Require validation state before access maps logic blocks
    if(!APP_STATE.currentUser && targetPageId !== 'home') {
        triggerAuthenticationModalSequence();
        return;
    }
    
    // Hide all architectural pages views nodes
    document.querySelectorAll(".view-page").forEach(page => {
        page.classList.add("hidden-view");
        page.classList.remove("active-view");
    });
    
    const targetedPageElement = document.getElementById(`page-${targetPageId}`);
    if(targetedPageElement) {
        targetedPageElement.classList.add("active-view");
        targetedPageElement.classList.remove("hidden-view");
        APP_STATE.activeViewPage = targetPageId;
    }

    // Update document title dynamically
    document.title = PAGE_TITLES[targetPageId] || 'Fort Mart';
    
    // Close phone responsive side layouts drawer automatically upon completion
    if (window.innerWidth <= 1024) {
        const sideDrawer = document.getElementById("side-drawer");
        if (sideDrawer) sideDrawer.classList.remove("active-phone-drawer");
    }
    
    // Update structural layouts dynamically based on sub page scopes
    const searchBarPlaceholder = document.getElementById("global-search-bar");
    if(targetPageId === 'home') {
        searchBarPlaceholder.placeholder = "Search Products……";
    } else if(targetPageId === 'messages') {
        searchBarPlaceholder.placeholder = "Search Chats……";
        renderUserConversationsLogRoster();
    } else if(targetPageId === 'my-account') {
        searchBarPlaceholder.placeholder = "Search Settings……";
        initializeProfileDetailsAccountManagementFieldsValues();
    } else if(targetPageId === 'prompt-workspace-aipage') {
        initPromptWorkspacePage();
    } else if (targetPageId === 'admin-dashboard') 
        searchBarPlaceholder.placeholder = "Search Users....."
        renderAdminUsersManagementList();  
}

/**
 * Complete Universal Modal Step-Workflow Lifecycle Framework Management Core
 */
function displayConfirmationModalOverlayAction(messageStringText, callbackFunctionReference) {
    const confirmModalNode = document.getElementById("confirm-modal");
    document.getElementById("confirm-modal-text").innerText = messageStringText;
    confirmModalNode.classList.add("active");
    
    const yesButtonNode = document.getElementById("confirm-yes-btn");
    const noButtonNode = document.getElementById("confirm-no-btn");

    const cleanYesNode = yesButtonNode.cloneNode(true);
    const cleanNoNode = noButtonNode.cloneNode(true);
    yesButtonNode.parentNode.replaceChild(cleanYesNode, yesButtonNode);
    noButtonNode.parentNode.replaceChild(cleanNoNode, noButtonNode);

    cleanYesNode.addEventListener("click", () => {
        confirmModalNode.classList.remove("active");
        callbackFunctionReference();
    });
    cleanNoNode.addEventListener("click", () => {
        confirmModalNode.classList.remove("active");
    });
}

// 1. Closes the main modal directly
function closeActiveModalDirectly(modalElementId) {
    const modalNode = document.getElementById(modalElementId);
    if (modalNode) {
        modalNode.classList.remove("active");
    }
}

// 2. Initiates the confirmation flow
function closeActiveModalWithConfirmationFlow(modalElementId) {
    displayConfirmationModalOverlayAction(
        "Are you sure you want to exit this window? Progress or entered structural fields changes may be permanently lost.", 
        () => {
            // This is the callback that runs ONLY when "Yes" is clicked
            closeActiveModalDirectly(modalElementId);
        }
    );
}

// 3. The confirmation handler (Make sure your function looks like this)
function displayConfirmationModalOverlayAction(message, onConfirmCallback) {
    const confirmModal = document.getElementById("confirmationModal");
    const confirmMessage = document.getElementById("confirmationMessage");
    const yesButton = document.getElementById("confirmYesBtn");
    const noButton = document.getElementById("confirmNoBtn");

    if (!confirmModal || !confirmMessage || !yesButton || !noButton) {
        console.error("Confirmation modal DOM elements missing.");
        return;
    }

    // Set the dynamic warning message
    confirmMessage.textContent = message;

    // Show the confirmation modal
    confirmModal.classList.add("active");

    // Clean up old event listeners to prevent duplicate triggers
    const newYesButton = yesButton.cloneNode(true);
    const newNoButton = noButton.cloneNode(true);
    yesButton.parentNode.replaceChild(newYesButton, yesButton);
    noButton.parentNode.replaceChild(newNoButton, noButton);

    // YES Flow: Run the callback (close main modal) and hide confirmation
    newYesButton.addEventListener("click", () => {
        onConfirmCallback(); 
        confirmModal.classList.remove("active");
    });

    // NO Flow: Just hide the confirmation modal, leaving the main modal open
    newNoButton.addEventListener("click", () => {
        confirmModal.classList.remove("active");
    });
}

/**
 * =========================================================================
 * COMPLETE USER ACCOUNTS AUTHENTICATION FLOW SUBSYSTEM (COOKIE MODIFIED)
 * =========================================================================
 */

/**
 * REPLACED: Updated Authentication Sequence initializing directly via Cookies
 * completely bypassing the legacy "Continue As" choice workflow.
 */
/**
 * Authentication Sequence initializing via Cookies with a Local Storage fallback for file:// protocols
 */
function triggerAuthenticationModalSequence() {
    try {
        // 1. Try to read from browser cookies first (Works on https:// and http://)
        let savedUid = getSecureAuthCookie("fort_mart_logged_uid");

        // 2. Fallback check: If cookies aren't set or blocked (e.g. running via file://), check local storage fallback
        if (!savedUid) {
            savedUid = localStorage.getItem("fort_mart_cookie_fallback_uid");
        }

        if (savedUid && typeof SYSTEM_DATABASE !== 'undefined' && SYSTEM_DATABASE.users) {
            // Find user in the system database array
            const accountRecordMatch = SYSTEM_DATABASE.users.find(u => u.uid === savedUid);
            
            if (accountRecordMatch) {
                // Bypass login prompt modal structures entirely and validate session
                finalizeSuccessfulAuthenticationSequence(accountRecordMatch);
                return;
            } else {
                eraseSecureAuthCookie("fort_mart_logged_uid");
                localStorage.removeItem("fort_mart_cookie_fallback_uid");
            }
        }
    } catch (e) {
        console.error("Authentication initialization exception context:", e);
        eraseSecureAuthCookie("fort_mart_logged_uid");
        localStorage.removeItem("fort_mart_cookie_fallback_uid");
    }

    // Default flow if no session token profile is active
    renderSignInModalStepContentLayout();
    document.getElementById("auth-modal").classList.add("active");
}

/**
 * Renders the default Sign-In interface view inside the authentication modal target wrapper
 */
function renderSignInModalStepContentLayout() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h2>Sign In to Fort Mart</h2>
        <div class="form-input-container">
            <label>Select Preferred Location:</label>
            <select id="auth-signin-country" class="form-field-control">
                <option value="Nigeria|+234">Nigeria (+234)</option>
            </select>
        </div>
      
        <div class="form-input-container">
            <label>Input Registered Email Address:</label>
            <input type="text" name="email" id="auth-signin-identifier" class="form-field-control" placeholder="Input registered email address:">
            <div id="err-signin-identifier" class="text-danger-alert hidden-node"></div>
        </div>
        <div class="form-input-container">
            <label>Account Password:</label>
         
            <input type="password" id="auth-signin-password" class="form-field-control" placeholder="Enter password">
            <div id="err-signin-password" class="text-danger-alert hidden-node"></div>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-signin-showpass" onchange="toggleFormPasswordFieldVisibility(this, 'auth-signin-password')">
            <label for="chk-signin-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Password</label>            
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-signin-rememberme">
            <label for="chk-signin-rememberme" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Remember Me</label>            
        </div>

        <div class="text-center margin-top-xs">
            <span style="color:var(--fort-blue-light); cursor:pointer; font-size:0.9rem;" onclick="renderForgotPasswordModalWorkflow()">Forgot Password?</span>
        </div>
        <div class="btn-group">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button>
            <button onclick="executeAccountSignInAuthenticationRequest()" class="btn-blue">Sign In</button>
        </div>
        <div class="text-center margin-top-sm" style="font-size:0.9rem;">
            <span>Don't have an account? </span><strong style="color:var(--fort-blue-light); cursor:pointer;" onclick="renderSignUpModalWizardStepOne()">Sign up</strong>
        </div>
    `;
}

/**
 * Utility helper toggling clear-text/password field visibility states dynamically
 */
function toggleFormPasswordFieldVisibility(checkboxElement, targetPasswordFieldId) {
    const passwordField = document.getElementById(targetPasswordFieldId);
    if (passwordField) {
        passwordField.type = checkboxElement.checked ? "text" : "password";
    }
}

/**
 * ------------------------------------------------------------------
 * 3. SIGN-IN WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeAccountSignInAuthenticationRequest() {
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        return;
    }

    const countryRawValue = document.getElementById("auth-signin-country").value.split("|");
    const dialingCode = countryRawValue[1];
    const identifierInput = document.getElementById("auth-signin-identifier").value.trim();
    const passwordInput = document.getElementById("auth-signin-password").value;
    
    const errIdNode = document.getElementById("err-signin-identifier");
    const errPassNode = document.getElementById("err-signin-password");
    errIdNode.classList.add("hidden-node");
    errPassNode.classList.add("hidden-node");

    // Query user record directly from Supabase 'users' table using the local 'db' client
    const { data: dbUsers, error: queryError } = await db
        .from('users')
        .select('*')
        .eq('dialing_code', dialingCode)
        .ilike('identifier_text', identifierInput);

    if (queryError || !dbUsers || dbUsers.length === 0) {
        errIdNode.innerText = "No registered matching account found for specified credentials.";
        errIdNode.classList.remove("hidden-node");
        return;
    }

    const accountRecordMatch = dbUsers[0];

    // Verify secret key matching password
    if (accountRecordMatch.secret_key !== passwordInput) {
        errPassNode.innerText = "Incorrect Password.";
        errPassNode.classList.remove("hidden-node");
        return;
    }

    const clientUserObj = {
        ...accountRecordMatch,
        identityName: accountRecordMatch.identity_name,
        accountType: accountRecordMatch.account_type,
        dialingCode: accountRecordMatch.dialing_code,
        identifierText: accountRecordMatch.identifier_text,
        secretKey: accountRecordMatch.secret_key,
        businessName: accountRecordMatch.business_name,
        businessInfo: accountRecordMatch.business_info
    };

    const rememberMeChecked = document.getElementById("chk-signin-rememberme").checked;
    
    if (rememberMeChecked) {
        setSecureAuthCookie("fort_mart_logged_uid", clientUserObj.uid, 7);
        localStorage.setItem("fort_mart_cookie_fallback_uid", clientUserObj.uid);
    } else {
        setSecureAuthCookie("fort_mart_logged_uid", clientUserObj.uid, null);
        localStorage.removeItem("fort_mart_cookie_fallback_uid");
    }
    
    finalizeSuccessfulAuthenticationSequence(clientUserObj);
}

/**
 * Shared helper utility containing the common success operations UI updates
 */
function finalizeSuccessfulAuthenticationSequence(accountRecordMatch) {
    if (typeof APP_STATE === 'undefined') {
        window.APP_STATE = {};
    }

    // Success State Login Sequence Activation
    APP_STATE.currentUser = accountRecordMatch;
    closeActiveModalDirectly('auth-modal');
    
    // Refresh structural visual nodes dependencies based on admin flag states
    const adminNavItem = document.getElementById("admin-nav-item");
    const adminSuiteBtn = document.getElementById("admin-add-suite-site-btn");
    
    if (accountRecordMatch.uid === 'admin') {
        if (adminNavItem) adminNavItem.classList.remove("hidden-admin-node");
        if (adminSuiteBtn) adminSuiteBtn.classList.remove("hidden-node");
        renderAdminDashboardMetricsCounters();
    } else {
        if (adminNavItem) adminNavItem.classList.add("hidden-admin-node");
        if (adminSuiteBtn) adminSuiteBtn.classList.add("hidden-node");
    }
    
    // Render profile interface modifications context arrays
    const navUserAvatar = document.getElementById("nav-user-avatar");
    if (navUserAvatar) {
        navUserAvatar.src = accountRecordMatch.avatar ||
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    }

    syncDrawerGuestTerminalNodeToActiveUser();
    changelogoutosignupviceVersa();
    
    // Launch Success Overlay Greeting Box
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.classList.add("active");
    
    if (typeof renderMarketplaceProductsDisplayLoop === 'function') {
        renderMarketplaceProductsDisplayLoop();
    }
}

/** Registration System Multi-step Engine Framework Array */
let SIGNUP_WIZARD_TEMPORARY_OBJECT = {};

function renderSignUpModalWizardStepOne() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h3>Sign Up - Provide Contact (Step 1 of 4)</h3>
        <div class="form-input-container margin-top-sm">
            <label>Select Preferred Location:</label>
            <select id="reg-country" class="form-field-control" onchange="evaluateSignUpStepOneFormCompletenessStateValidation()">
                <option value="Nigeria|+234" selected>Nigeria (+234)</option>
            </select>
        </div>
    
        <div class="form-input-container">
            <label>Input Email Address:</label>
            <input type="text" name:="email" id="reg-identifier" class="form-field-control" placeholder="Input email address:" oninput="evaluateSignUpStepOneFormCompletenessStateValidation()">
            <div id="err-reg-step1-feedback" class="text-danger-alert hidden-node">Input all information properly</div>
        </div>
        
        <div class="form-checkbox-group-row margin-top-xs">
            <input type="checkbox" id="chk-reg-terms" onchange="evaluateSignUpStepOneFormCompletenessStateValidation()">
            <label for="chk-reg-terms" style="font-size:0.82rem;">I accept the <a href="fort-mart-terms-and-conditions.html" >terms and conditions</a></label>
        </div>
        <div class="form-checkbox-group-row margin-top-xs">
            <input type="checkbox" id="chk-reg-privacy" onchange="evaluateSignUpStepOneFormCompletenessStateValidation()">
            <label for="chk-reg-privacy" style="font-size:0.82rem;">I accept the <a href="fort-mart-privacy-policy.html" >privacy policy</a></label>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button>
            <button id="btn-signup-step1-next" onclick="executeProcessSignUpStepOneNextSequenceAction()" class="btn-blue faintly-colored" disabled>Next</button>
        </div>
    `;
}

function evaluateSignUpStepOneFormCompletenessStateValidation() {
    const identifierTextVal = document.getElementById("reg-identifier").value.trim();
    const termsAcceptedFlag = document.getElementById("chk-reg-terms").checked;
    const privacyAcceptedFlag = document.getElementById("chk-reg-privacy").checked;
    const nextButtonNode = document.getElementById("btn-signup-step1-next");
    
    if(identifierTextVal.length > 4 && termsAcceptedFlag && privacyAcceptedFlag) {
        nextButtonNode.disabled = false;
        nextButtonNode.classList.remove("faintly-colored");
    } else {
        nextButtonNode.disabled = true;
        nextButtonNode.classList.add("faintly-colored");
    }
}

function executeProcessSignUpStepOneNextSequenceAction() {
    const countryRawVal = document.getElementById("reg-country").value.split("|");
    const identifierInputVal = document.getElementById("reg-identifier").value.trim();
    const errFieldFeedback = document.getElementById("err-reg-step1-feedback");
    
    errFieldFeedback.classList.add("hidden-node");
    const duplicateMatchCheck = SYSTEM_DATABASE.users.find(u => u.dialingCode === countryRawVal[1] && u.identifierText.toLowerCase() === identifierInputVal.toLowerCase());
    if(duplicateMatchCheck) {
        errFieldFeedback.innerText = "An account is already linked to this phone number/email address. Sign in.";
        errFieldFeedback.classList.remove("hidden-node");
        return;
    }
    
    SIGNUP_WIZARD_TEMPORARY_OBJECT.country = countryRawVal[0];
    SIGNUP_WIZARD_TEMPORARY_OBJECT.dialingCode = countryRawVal[1];
    SIGNUP_WIZARD_TEMPORARY_OBJECT.identifierText = identifierInputVal;
    
    renderSignUpModalWizardStepTwo();
}

function renderSignUpModalWizardStepTwo() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h3>Sign Up - Provide Account Info (Step 2 of 4)</h3>
        <div class="form-input-container margin-top-sm">
            <label>Select Account Type:</label>
            <select id="reg-account-type" class="form-field-control" onchange="toggleSignUpStepTwoClassificationFormsLayout(this.value)">
                <option value="personal" selected>Personal (Consumer) Account</option>
                <option value="business">Business (Commercial) Account</option>
            </select>
        </div>
        
        <div id="signup-dynamic-fields-wrapper">
            <div class="form-input-container">
                <label>Input Personal Full Name:</label>
                <input type="text" name="name" id="reg-personal-name" class="form-field-control" placeholder="Enter personal name" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Upload Profile Picture (Optional):</label>
                <div class="form-input-container-image">
                    <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                        <span id="placeholderTextimg-signup">No image selected</span>
                        <img id="imagePreview-signup" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;">
                    </div>
                </div>
                <input type="file" id="reg-avatar-file" class="form-field-control" accept=".png, .jpg, .jpeg" onchange="processSignUpAvatarFileSelection()">
            </div>
            <div id="err-reg-step2-feedback" class="text-danger-alert hidden-node">Input all information properly</div>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="renderSignUpModalWizardStepOne()" class="btn-gray">Back</button>
            <button id="btn-signup-step2-next" onclick="executeProcessSignUpStepTwoNextSequenceAction()" class="btn-blue faintly-colored" disabled>Next</button>
        </div>
    `;
    SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar = ""; 
    SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = false;
    validateSignUpStepTwoDataFormCompleteness();
}

function toggleSignUpStepTwoClassificationFormsLayout(selectedClassificationType) {
    const fieldsWrapper = document.getElementById("signup-dynamic-fields-wrapper");
    if(selectedClassificationType === 'personal') {
        fieldsWrapper.innerHTML = `
            <div class="form-input-container">
                <label>Input Personal Full Name:</label>
                <input type="text" name="name" id="reg-personal-name" class="form-field-control" placeholder="Enter personal name" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Upload Profile Picture (Optional):</label>
                <div class="form-input-container-image">
                    <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                        <span id="placeholderTextimg-signup">No image selected</span>
                        <img id="imagePreview-signup" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;">
                    </div>
                </div>
                <input type="file" id="reg-avatar-file" class="form-field-control" accept=".png, .jpg, .jpeg" onchange="processSignUpAvatarFileSelection()">
            </div>
            <div id="err-reg-step2-feedback" class="text-danger-alert hidden-node">Input all information properly</div>
        `;
    } else {
        fieldsWrapper.innerHTML = `
            <div class="form-input-container">
                <label>Input Business Name:</label>
                <input type="text" id="reg-biz-name" class="form-field-control" placeholder="Enter corporate trading identity" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Provide Business Public Summary:</label>
                <input type="text" id="reg-biz-info" class="form-field-control" placeholder="Briefly describe your company summary" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Input Personal Full Name:</label>
                <input type="text" name="name" id="reg-personal-name" class="form-field-control" placeholder="Enter operational manager name" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Inventory Specification:</label>
                <input type="text" id="reg-biz-deals" class="form-field-control" placeholder="e.g. Mobile Accessories, Clothing apparel, Laptops" oninput="validateSignUpStepTwoDataFormCompleteness()">
            </div>
            <div class="form-input-container">
                <label>Upload Profile Picture (Optional):</label>
                <div class="form-input-container-image">
                    <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                        <span id="placeholderTextimg-signup">No image selected</span>
                        <img id="imagePreview-signup" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;">
                    </div>
                </div>
                <input type="file" id="reg-avatar-file" class="form-field-control" accept=".png, .jpg, .jpeg" onchange="processSignUpAvatarFileSelection()">
            </div>
            <div id="err-reg-step2-feedback" class="text-danger-alert hidden-node">Input all information properly</div>
        `;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar = ""; 
    SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = false;
    validateSignUpStepTwoDataFormCompleteness();
}

function processSignUpAvatarFileSelection() {
    const fileNode = document.getElementById("reg-avatar-file");
    const placeholder = document.getElementById("placeholderTextimg-signup");
    const preview = document.getElementById("imagePreview-signup");

    if (fileNode && fileNode.files && fileNode.files[0]) {
        // Step A: Flag that we've started reading the selected file.
        SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = true;
        validateSignUpStepTwoDataFormCompleteness(); // This disables and lightens the Next button instantly

        const readerInstance = new FileReader();
        
        readerInstance.onload = function(e) {
            // Step B: Set the preview image source, make it visible, and hide placeholder text.
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block";
            }
            if (placeholder) {
                placeholder.style.display = "none";
            }
            
            // Step C: Complete registration tracking and clear wait locks.
            SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar = e.target.result;
            SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = false;
            validateSignUpStepTwoDataFormCompleteness(); // Re-evaluate and release the Next button lock
        };

        readerInstance.onerror = function() {
            // Reset read state if file loading errors out.
            SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = false;
            validateSignUpStepTwoDataFormCompleteness();
        };

        readerInstance.readAsDataURL(fileNode.files[0]);
    } else {
        // If file input was cleared, revert preview boxes to default.
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }
        if (placeholder) {
            placeholder.style.display = "block";
        }
        SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar = "";
        SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading = false;
        validateSignUpStepTwoDataFormCompleteness();
    }
}

function validateSignUpStepTwoDataFormCompleteness() {
    const currentType = document.getElementById("reg-account-type").value;
    const nextBtn = document.getElementById("btn-signup-step2-next");
    const personalNameInput = document.getElementById("reg-personal-name") ? document.getElementById("reg-personal-name").value.trim() : "";
    
    // Core check: If the FileReader is currently working, keep nextBtn disabled & faintly colored
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.isAvatarReading) {
        nextBtn.disabled = true;
        nextBtn.classList.add("faintly-colored");
        return;
    }

    if(currentType === 'personal') {
        if(personalNameInput.length > 1) {
            nextBtn.disabled = false;
            nextBtn.classList.remove("faintly-colored");
        } else {
            nextBtn.disabled = true;
            nextBtn.classList.add("faintly-colored");
        }
    } else {
        const bizNameInput = document.getElementById("reg-biz-name").value.trim();
        const bizInfoInput = document.getElementById("reg-biz-info").value.trim();
        const bizDealsInput = document.getElementById("reg-biz-deals").value.trim();
        
        if(personalNameInput.length > 1 && bizNameInput.length > 1 && bizInfoInput.length > 1 && bizDealsInput.length > 1) {
            nextBtn.disabled = false;
            nextBtn.classList.remove("faintly-colored");
        } else {
            nextBtn.disabled = true;
            nextBtn.classList.add("faintly-colored");
        }
    }
}

function executeProcessSignUpStepTwoNextSequenceAction() {
    const currentType = document.getElementById("reg-account-type").value;
    SIGNUP_WIZARD_TEMPORARY_OBJECT.accountType = currentType;
    SIGNUP_WIZARD_TEMPORARY_OBJECT.identityName = document.getElementById("reg-personal-name").value.trim();
    if(currentType === 'business') {
        SIGNUP_WIZARD_TEMPORARY_OBJECT.businessName = document.getElementById("reg-biz-name").value.trim();
        SIGNUP_WIZARD_TEMPORARY_OBJECT.businessInfo = document.getElementById("reg-biz-info").value.trim();
        SIGNUP_WIZARD_TEMPORARY_OBJECT.productsDealtIn = document.getElementById("reg-biz-deals").value.trim();
    } else {
        SIGNUP_WIZARD_TEMPORARY_OBJECT.businessName = "";
        SIGNUP_WIZARD_TEMPORARY_OBJECT.businessInfo = "";
        SIGNUP_WIZARD_TEMPORARY_OBJECT.productsDealtIn = "";
    }
    
    renderSignUpModalWizardStepThree();
}

function renderSignUpModalWizardStepThree() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h3>Sign Up - Create Security Password (Step 3 of 4)</h3>
        <p style="font-size:0.8rem; color:var(--fort-gray-slate); margin-top:4px;">Must contain at least 6 characters comprising 1 uppercase literal, 1 lowercase literal, 1 numeric digit, and 1 non-alphanumeric special character symbol.</p>
        
        <div class="form-input-container margin-top-sm">
            <label>Input Desired Password:</label>
            <input type="password" id="reg-password-1" class="form-field-control" placeholder="Input Password Expression">
        </div>
        <div class="form-input-container">
            <label>Re-type Password to Confirm:</label>
            <input type="password" id="reg-password-2" class="form-field-control" placeholder="Confirm Password">
            <div id="err-reg-step3-validation-msg" class="text-danger-alert hidden-node"></div>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-reg-showpass" onchange="toggleFormPasswordVisibilityChainSignUp()">
            <label for="chk-reg-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Passwords</label>            
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="renderSignUpModalWizardStepTwo()" class="btn-gray">Back</button>
            <button onclick="executeValidateAndProcessSignUpStepThree()" class="btn-blue">Next</button>
        </div>
    `;
}

function toggleFormPasswordVisibilityChainSignUp() {
    const status = document.getElementById("chk-reg-showpass").checked;
    document.getElementById("reg-password-1").type = status ? "text" : "password";
    document.getElementById("reg-password-2").type = status ? "text" : "password";
}

function executeValidateAndProcessSignUpStepThree() {
    const pass1 = document.getElementById("reg-password-1").value;
    const pass2 = document.getElementById("reg-password-2").value;
    const errorNode = document.getElementById("err-reg-step3-validation-msg");
    errorNode.classList.add("hidden-node");
    
    const requirementStatementText = "Any password created should have at least one uppercase letter, one lowercase letter, one symbol, one number and should be at least six characters.";
    if(pass1 !== pass2) {
        errorNode.innerText = "Password mismatch configuration discovered. Verification entries must align perfectly.";
        errorNode.classList.remove("hidden-node");
        return;
    }
    
    const passesLengthTest = pass1.length >= 6;
    const passesUppercaseTest = /[A-Z]/.test(pass1);
    const passesLowercaseTest = /[a-z]/.test(pass1);
    const passesDigitTest = /[0-9]/.test(pass1);
    const passesSymbolTest = /[^A-Za-z0-9]/.test(pass1);
    if(!passesLengthTest || !passesUppercaseTest || !passesLowercaseTest || !passesDigitTest || !passesSymbolTest) {
        errorNode.innerText = requirementStatementText;
        errorNode.classList.remove("hidden-node");
        return;
    }
    
    SIGNUP_WIZARD_TEMPORARY_OBJECT.secretKey = pass1;
    sendSignUpEmailJsOtpWorkflow(true);
}

/**
 * Handles generating, tracking, and executing EmailJS calls for OTP validation.
 * Enforces a daily constraint limit of 5 total sent requests per email address.
 */
async function sendSignUpEmailJsOtpWorkflow(isInitialLaunch = false) {
    const targetEmail = SIGNUP_WIZARD_TEMPORARY_OBJECT.identifierText;
    const todayKeyStr = "otp_limit_" + new Date().toISOString().split('T')[0] + "_" + targetEmail.toLowerCase();
    
    let dailyAttemptsCount = parseInt(localStorage.getItem(todayKeyStr) || "0", 10);
    if (dailyAttemptsCount >= 5) {
        if (!isInitialLaunch) {
            const feedbackElement = document.getElementById("err-reg-step4-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 OTPs per day.";
                feedbackElement.classList.remove("hidden-node");
            }
        } else {
            renderSignUpModalWizardStepFour();
            setTimeout(() => {
                const feedbackElement = document.getElementById("err-reg-step4-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 OTPs per day.";
                    feedbackElement.classList.remove("hidden-node");
                }
            }, 50);
        }
        return;
    }

    // Trigger visual/logical 30-second resend cooldown block on successful checks
    initiateSignUpOtpResendCooldown();
    const freshGeneratedOtpCode = Math.floor(1000 + Math.random() * 9000);
    SIGNUP_WIZARD_TEMPORARY_OBJECT.activeVerificationOtp = freshGeneratedOtpCode;

    dailyAttemptsCount++;
    localStorage.setItem(todayKeyStr, dailyAttemptsCount.toString());
    if (!isInitialLaunch) {
        const feedbackElement = document.getElementById("err-reg-step4-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Sending fresh code...";
            feedbackElement.style.color = "blue";
            feedbackElement.classList.remove("hidden-node");
        }
    }

    try {
        if (window.emailjs) {
            await window.emailjs.send(
                "service_ejag5pe", 
                "template_jz0s31e", 
                {
                    to_email: targetEmail,
                    user_name: SIGNUP_WIZARD_TEMPORARY_OBJECT.identityName,
                    otp_code: freshGeneratedOtpCode
                }
            );
            if (isInitialLaunch) {
                renderSignUpModalWizardStepFour();
            } else {
                const feedbackElement = document.getElementById("err-reg-step4-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "A new verification code has been successfully sent.";
                    feedbackElement.style.color = "green";
                }
            }
        } else {
            console.warn("EmailJS library not loaded on global window context.");
            if (isInitialLaunch) renderSignUpModalWizardStepFour();
        }
    } catch (sendErr) {
        console.error("EmailJS transport error:", sendErr);
        if (isInitialLaunch) {
            renderSignUpModalWizardStepFour();
        } else {
            const feedbackElement = document.getElementById("err-reg-step4-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Failed to send code. Please check your connection.";
                feedbackElement.style.color = "red";
            }
        }
    }
}

/**
 * Handles running tracking operations and layouts for the registration 30-second timer.
 */
function initiateSignUpOtpResendCooldown() {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval);
    }

    SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft = 30;

    SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval = setInterval(() => {
        SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft--;
        
        const resendLinkNode = document.getElementById("signup-otp-resend-link");
        if (resendLinkNode) {
            if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft > 0) {
                resendLinkNode.innerText = `Resend in ${SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft}s`;
                resendLinkNode.style.opacity = "0.5";
                resendLinkNode.style.fontWeight = "400";
                resendLinkNode.style.pointerEvents = "none";
            } else {
                resendLinkNode.innerText = "Resend";
                resendLinkNode.style.opacity = "1";
                resendLinkNode.style.fontWeight = "600";
                resendLinkNode.style.pointerEvents = "auto";
                clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval);
                SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval = null;
            }
        } else if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft <= 0) {
            clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval);
            SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval = null;
        }
    }, 1000);
}

/**
 * Click interceptor block safeguarding link responses against active cooldowns.
 */
function handleSignUpOtpResendActionClickInterception() {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft > 0) {
        return;
    }
    sendSignUpEmailJsOtpWorkflow(false);
}

function renderSignUpModalWizardStepFour() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    const maskedTargetEmail = SIGNUP_WIZARD_TEMPORARY_OBJECT.identifierText;
    // Evaluate cooldown details to sustain layout state seamlessly on rendering
    const secondsLeft = SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft || 0;
    const textLabel = secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend";
    const opacityStyle = secondsLeft > 0 ? "0.5" : "1";
    const weightStyle = secondsLeft > 0 ? "400" : "600";
    const pointerEventsStyle = secondsLeft > 0 ? "none" : "auto";

    wrapperTargetNode.innerHTML = `
        <h3>Sign Up - Verify Email Identity (Step 4 of 4)</h3>
        <p style="font-size:0.92rem; color:var(--fort-blue-dark); line-height: 1.5; margin-top:12px; font-weight: 500;">
            Enter the OTP sent to ${maskedTargetEmail}
        </p>
        
        <div class="form-input-container margin-top-sm" style="margin-top:15px;">
            <label>Input 4-Digit OTP Code:</label>
            <input type="text" id="reg-otp-input" class="form-field-control" placeholder="X X X X" maxlength="4" style="text-align:center; font-size:1.25rem; letter-spacing:8px;">
            <div id="err-reg-step4-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>

        <div style="margin-top: 10px; font-size: 0.85rem;">
            <span>Didn't receive message? </span>
            <a href="javascript:void(0)" 
               id="signup-otp-resend-link"
               onclick="handleSignUpOtpResendActionClickInterception()" 
               style="color: #007bff; font-weight: ${weightStyle}; opacity: ${opacityStyle}; pointer-events: ${pointerEventsStyle}; text-decoration: none;">${textLabel}</a>
        </div>

        <p style="font-size:0.92rem; color:var(--fort-blue-dark); line-height: 1.5; margin-top:12px; font-weight: 500;">
            Note: If you didn't see the message in your inbox, also check the spam section in your email and tag the email "Not Spam".
        </p>
        
        <div class="btn-group margin-top-lg" style="margin-top: 20px;">
            <button onclick="handleClearSignUpTimersAndReturnToStepThree()" class="btn-gray">Back</button>
            <button id="btn-signup-finalize-submit" onclick="executeFinalizeAccountRegistrationPipelineSubmission()" class="btn-blue">Complete Registration</button>
        </div>
    `;
}

function handleClearSignUpTimersAndReturnToStepThree() {
    // Clear intervals if navigating backward to keep UI flow crisp
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval);
        SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval = null;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft = 0;
    renderSignUpModalWizardStepThree();
}

/**
 * Finalizes account registration after OTP verification, creates initial user state,
 * sends a welcome message, and updates the admin dashboard user metrics.
 */
/**
 * ------------------------------------------------------------------
 * 2. SIGN-UP & AVATAR UPLOAD WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeFinalizeAccountRegistrationPipelineSubmission() {
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        return;
    }

    const userInputCodeField = document.getElementById("reg-otp-input");
    const feedbackElement = document.getElementById("err-reg-step4-feedback");
    if (feedbackElement) {
        feedbackElement.classList.add("hidden-node");
        feedbackElement.style.color = "red";
    }

    const typedOtpValue = userInputCodeField.value.trim();
    const systemExpectedValue = String(SIGNUP_WIZARD_TEMPORARY_OBJECT.activeVerificationOtp || "");
    if (!typedOtpValue || typedOtpValue !== systemExpectedValue) {
        if (feedbackElement) {
            feedbackElement.innerText = "Invalid verification token. Please verify entry values.";
            feedbackElement.classList.remove("hidden-node");
        }
        return;
    }

    // Clean up OTP tracking intervals
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval);
        SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpInterval = null;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.signUpOtpSecondsLeft = 0;
    
    const generatedUid = "user_" + Date.now();
    let publicAvatarUrl = "";

    // Upload image to public Supabase Storage bucket 'user-avatars' if an image is attached
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar) {
        publicAvatarUrl = await uploadAvatarToSupabaseStorage(SIGNUP_WIZARD_TEMPORARY_OBJECT.avatar, generatedUid);
    }

    const finalNewUserRecord = {
        uid: generatedUid,
        identity_name: SIGNUP_WIZARD_TEMPORARY_OBJECT.identityName,
        account_type: SIGNUP_WIZARD_TEMPORARY_OBJECT.accountType,
        country: SIGNUP_WIZARD_TEMPORARY_OBJECT.country,
        dialing_code: SIGNUP_WIZARD_TEMPORARY_OBJECT.dialingCode,
        identifier_text: SIGNUP_WIZARD_TEMPORARY_OBJECT.identifierText,
        secret_key: SIGNUP_WIZARD_TEMPORARY_OBJECT.secretKey,
        avatar: publicAvatarUrl,
        business_name: SIGNUP_WIZARD_TEMPORARY_OBJECT.businessName || SIGNUP_WIZARD_TEMPORARY_OBJECT.identityName,
        business_info: SIGNUP_WIZARD_TEMPORARY_OBJECT.businessInfo || "No descriptions detailed yet."
    };

    // Insert record asynchronously into Supabase 'users' table using the local 'db' client
    const { data: insertedUser, error: insertError } = await db
        .from('users')
        .insert([finalNewUserRecord])
        .select()
        .single();

    if (insertError) {
        console.error("Error inserting user into Supabase:", insertError.message);
        if (feedbackElement) {
            feedbackElement.innerText = "Database registration failed: " + insertError.message;
            feedbackElement.classList.remove("hidden-node");
        }
        return;
    }

    // Map DB column conventions back to client state runtime
    const activeUserObj = {
        ...insertedUser,
        identityName: insertedUser.identity_name,
        accountType: insertedUser.account_type,
        dialingCode: insertedUser.dialing_code,
        identifierText: insertedUser.identifier_text,
        secretKey: insertedUser.secret_key,
        businessName: insertedUser.business_name,
        businessInfo: insertedUser.business_info
    };

    SYSTEM_DATABASE.users.push(activeUserObj);

    // Save session UID state
    setSecureAuthCookie("fort_mart_logged_uid", activeUserObj.uid, 7);
    localStorage.setItem("fort_mart_cookie_fallback_uid", activeUserObj.uid);
    APP_STATE.currentUser = activeUserObj;

    closeActiveModalDirectly('auth-modal');
    document.getElementById("welcome-modal").classList.add("active");
    renderMarketplaceProductsDisplayLoop();
}

function renderForgotPasswordModalWorkflow() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h3>Reset Password - Identify Account (Step 1 of 3)</h3>
        <p style="font-size:0.85rem; margin-top:6px; color:var(--fort-gray-slate);">
            Provide your country code and registered identification details to verify your account profile.
        </p>
        
        <div class="form-input-container margin-top-sm">
            <label style="font-size:0.82rem; font-weight:700; color:var(--fort-gray-slate);">Country Code:</label>
            <select id="forgot-country" class="form-field-control">
                <option value="+234" selected>+234 (Nigeria)</option>
            </select>
        </div>

        <div class="form-input-container margin-top-xs">
            <label style="font-size:0.82rem; font-weight:700; color:var(--fort-gray-slate);">Registration Contact (Email Address):</label>
            <input type="text" name="email" id="forgot-id" class="form-field-control" placeholder="example@domain.com">
            <div id="err-forgot-step1-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Close</button>
            <button id="btn-forgot-step1-next" onclick="executeValidateForgotPasswordStepOnePipelineTrace()" class="btn-blue">Next</button>
        </div>
    `;
}

async function executeValidateForgotPasswordStepOnePipelineTrace() {
    const code = document.getElementById("forgot-country").value.trim();
    const rawId = document.getElementById("forgot-id").value.trim();
    const errorNode = document.getElementById("err-forgot-step1-feedback");
    const nextBtn = document.getElementById("btn-forgot-step1-next");
    
    errorNode.classList.add("hidden-node");
    errorNode.innerText = "";

    const accountMatch = SYSTEM_DATABASE.users.find(u => 
        u.dialingCode === code && 
        u.identifierText.toLowerCase() === rawId.toLowerCase()
    );
    if(!accountMatch) {
        errorNode.innerText = "No structural match trace discovered checking records configuration baseline arrays.";
        errorNode.classList.remove("hidden-node");
        return;
    }
    
    SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetUid = accountMatch.uid;
    SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetEmail = accountMatch.identifierText;
    SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetName = accountMatch.identityName || "User";

    if (nextBtn) nextBtn.disabled = true;
    await sendForgotPasswordEmailJsOtpWorkflow(true);
}

async function sendForgotPasswordEmailJsOtpWorkflow(isInitialLaunch = false) {
    const targetEmail = SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetEmail;
    const todayKeyStr = "otp_forgot_limit_" + new Date().toISOString().split('T')[0] + "_" + targetEmail.toLowerCase();
    
    let dailyAttemptsCount = parseInt(localStorage.getItem(todayKeyStr) || "0", 10);
    if (dailyAttemptsCount >= 5) {
        if (!isInitialLaunch) {
            const feedbackElement = document.getElementById("err-forgot-step2-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 recovery OTPs per day.";
                feedbackElement.classList.remove("hidden-node");
            }
        } else {
            renderForgotPasswordOtpVerificationLayout();
            setTimeout(() => {
                const feedbackElement = document.getElementById("err-forgot-step2-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 recovery OTPs per day.";
                    feedbackElement.classList.remove("hidden-node");
                }
            }, 50);
        }
        return;
    }

    // Trigger the 30 seconds countdown timer when a request successfully passes limits
    initiateOtpResendCooldown();

    const freshGeneratedOtpCode = Math.floor(1000 + Math.random() * 9000);
    SIGNUP_WIZARD_TEMPORARY_OBJECT.activeResetOtp = freshGeneratedOtpCode;

    dailyAttemptsCount++;
    localStorage.setItem(todayKeyStr, dailyAttemptsCount.toString());

    if (!isInitialLaunch) {
        const feedbackElement = document.getElementById("err-forgot-step2-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Sending fresh token key paths...";
            feedbackElement.style.color = "blue";
            feedbackElement.classList.remove("hidden-node");
        }
    }

    try {
        if (window.emailjs) {
            await window.emailjs.send(
                "service_ejag5pe", 
                "template_nzub7tk", 
                {
                    to_email: targetEmail,
                    user_name: SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetName,
                    otp_code: freshGeneratedOtpCode
                }
            );
            if (isInitialLaunch) {
                renderForgotPasswordOtpVerificationLayout();
            } else {
                const feedbackElement = document.getElementById("err-forgot-step2-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "A new security token validation string code has been sent.";
                    feedbackElement.style.color = "green";
                }
            }
        } else {
            console.warn("EmailJS script dependency structure is unavailable.");
            if (isInitialLaunch) renderForgotPasswordOtpVerificationLayout();
        }
    } catch (sendErr) {
        console.error("EmailJS password recovery submission sequence failure:", sendErr);
        if (isInitialLaunch) {
            renderForgotPasswordOtpVerificationLayout();
        } else {
            const feedbackElement = document.getElementById("err-forgot-step2-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Failed transmission delivery. Please verify connectivity.";
                feedbackElement.style.color = "red";
            }
        }
    }
}

/**
 * Handles controlling tracking values and interval states for the 30-second cooldown.
 */
function initiateOtpResendCooldown() {
    // Clear any existing active intervals to avoid duplicate speed runners
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval);
    }

    SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft = 30;

    SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval = setInterval(() => {
        SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft--;
        
        const resendLinkNode = document.getElementById("forgot-otp-resend-link");
        if (resendLinkNode) {
            if (SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft > 0) {
                resendLinkNode.innerText = `Resend in ${SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft}s`;
                resendLinkNode.style.opacity = "0.5";
                resendLinkNode.style.fontWeight = "400";
                resendLinkNode.style.pointerEvents = "none";
            } else {
                resendLinkNode.innerText = "Resend";
                resendLinkNode.style.opacity = "1";
                resendLinkNode.style.fontWeight = "600";
                resendLinkNode.style.pointerEvents = "auto";
                clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval);
                SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval = null;
            }
        } else if (SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft <= 0) {
            // Stop interval if element context is out of layout focus
            clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval);
            SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval = null;
        }
    }, 1000);
}

/**
 * Wrapper interceptor ensuring code execution doesn't process if a cooldown window is active.
 */
function handleOtpResendActionClickInterception() {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft > 0) {
        return; 
    }
    sendForgotPasswordEmailJsOtpWorkflow(false);
}

function renderForgotPasswordOtpVerificationLayout() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    const maskedTargetEmail = SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetEmail;

    // Evaluate state properties dynamically on initial layout attachment
    const secondsLeft = SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft || 0;
    const textLabel = secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend";
    const opacityStyle = secondsLeft > 0 ? "0.5" : "1";
    const weightStyle = secondsLeft > 0 ? "400" : "600";
    const pointerEventsStyle = secondsLeft > 0 ? "none" : "auto";

    wrapperTargetNode.innerHTML = `
        <h3>Reset Password - Verify Identity (Step 2 of 3)</h3>
        <p style="font-size:0.92rem; color:var(--fort-blue-dark); line-height: 1.5; margin-top:12px; font-weight: 500;">
            Enter the OTP sent to ${maskedTargetEmail}
        </p>
        
        <div class="form-input-container margin-top-sm" style="margin-top:15px;">
            <label style="font-size:0.82rem; font-weight:700; color:var(--fort-gray-slate);">Input 4-Digit Security Reset Code Key:</label>
            <input type="text" id="forgot-otp-input" class="form-field-control" placeholder="X X X X" maxlength="4" style="text-align:center; font-size:1.25rem; letter-spacing:8px;">
            <div id="err-forgot-step2-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>

        <div style="margin-top: 10px; font-size: 0.85rem;">
            <span>Didn't receive message? </span>
            <a href="javascript:void(0)" 
               id="forgot-otp-resend-link"
               onclick="handleOtpResendActionClickInterception()" 
               style="color: #007bff; font-weight: ${weightStyle}; opacity: ${opacityStyle}; pointer-events: ${pointerEventsStyle}; text-decoration: none;">${textLabel}</a>
        </div>

        <p style="font-size:0.92rem; color:var(--fort-blue-dark); line-height: 1.5; margin-top:12px; font-weight: 500;">
            Note: If you didn't see the message in your inbox, also check the spam section in your email and tag the email "Not Spam".
        </p>
        
        <div class="btn-group margin-top-lg" style="margin-top: 20px;">
            <button onclick="renderForgotPasswordModalWorkflow()" class="btn-gray">Back</button>
            <button id="btn-forgot-finalize-otp" onclick="executeValidateForgotPasswordOtpEntryToken()" class="btn-blue">Verify Code</button>
        </div>
    `;
}

function executeValidateForgotPasswordOtpEntryToken() {
    const userInputCodeField = document.getElementById("forgot-otp-input");
    const feedbackElement = document.getElementById("err-forgot-step2-feedback");
    if (feedbackElement) {
        feedbackElement.classList.add("hidden-node");
        feedbackElement.style.color = "red";
    }

    const typedOtpValue = userInputCodeField.value.trim();
    const systemExpectedValue = String(SIGNUP_WIZARD_TEMPORARY_OBJECT.activeResetOtp || "");
    if (!typedOtpValue || typedOtpValue !== systemExpectedValue) {
        if (feedbackElement) {
            feedbackElement.innerText = "Invalid security verification token matched. Verify entry values.";
            feedbackElement.classList.remove("hidden-node");
        }
        return;
    }

    // Clean up timers on successful validation phase transitions
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval);
        SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownInterval = null;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.otpCooldownSecondsLeft = 0;

    renderForgotPasswordStepTwoLayout();
}

function renderForgotPasswordStepTwoLayout() {
    const wrapperTargetNode = document.getElementById("auth-modal-content");
    wrapperTargetNode.innerHTML = `
        <h3>Reset Password - Define New Security Key (Step 3 of 3)</h3>
        <div class="form-input-container margin-top-sm">
            <label>Input New Security Access Password Token Key Pattern:</label>
            <input type="password" id="forgot-newpass-1" class="form-field-control" placeholder="New Password Expression">
        </div>
        <div class="form-input-container">
            <label>Re-type New Password Expression to Confirm Alignment:</label>
            <input type="password" id="forgot-newpass-2" class="form-field-control" placeholder="Confirm Password Expression">
            <div id="err-forgot-newpass-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>
        <div class="btn-group" style="margin-top: 15px;">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Discard Session</button>
            <button onclick="executeCommitNewPasswordToSystemDatabase()" class="btn-blue">Save & Login</button>
        </div>
    `;
}

/**
 * ------------------------------------------------------------------
 * 4. FORGOT PASSWORD WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeCommitNewPasswordToSystemDatabase() {
    const p1 = document.getElementById("forgot-newpass-1").value;
    const p2 = document.getElementById("forgot-newpass-2").value;
    const errorNode = document.getElementById("err-forgot-newpass-feedback");
    errorNode.classList.add("hidden-node");
    
    if (p1 !== p2) {
        errorNode.innerText = "Password structural mismatch discovered checking confirmation fields.";
        errorNode.classList.remove("hidden-node");
        return;
    }
    
    if (p1.length < 6 || !/[A-Z]/.test(p1) || !/[a-z]/.test(p1) || !/[0-9]/.test(p1) || !/[^A-Za-z0-9]/.test(p1)) {
        errorNode.innerText = "Password must have at least one uppercase letter, one lowercase letter, one symbol, one number and be at least six characters.";
        errorNode.classList.remove("hidden-node");
        return;
    }
    
    const targetUid = SIGNUP_WIZARD_TEMPORARY_OBJECT.resetTargetUid;

    // Overwrite and update secret_key field in Supabase 'users' table
    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ secret_key: p1 })
        .eq('uid', targetUid)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating secret_key in Supabase:", updateError.message);
        errorNode.innerText = "Failed to update password: " + updateError.message;
        errorNode.classList.remove("hidden-node");
        return;
    }

    const clientUserObj = {
        ...updatedUser,
        identityName: updatedUser.identity_name,
        accountType: updatedUser.account_type,
        dialingCode: updatedUser.dialing_code,
        identifierText: updatedUser.identifier_text,
        secretKey: updatedUser.secret_key,
        businessName: updatedUser.business_name,
        businessInfo: updatedUser.business_info
    };

    APP_STATE.currentUser = clientUserObj;
    closeActiveModalDirectly('auth-modal');
    document.getElementById("welcome-modal").classList.add("active");
    renderMarketplaceProductsDisplayLoop();
}

/**
 * Product Discovery Inventory Pipeline Management Loop & Search Filter Subsystem Engine Modules
 */
function buildCategoryRibbonFilterInterfaceElements() {
    const structuralCategoryListArray = ["Trending", "Electrical Appliances", "Mobile Devices & Computers", "Home Furniture", "Fashion Clothing Apparel", "Automotive Parts & Engines","Beauty & Personal Care", "Sports, Fitness and Outdoors", "Groceries & Essentials", "Others"];
    const targetsWrapperNode = document.getElementById("category-items-container");
    targetsWrapperNode.innerHTML = "";
    
    structuralCategoryListArray.forEach(catName => {
        const chipBtnNode = document.createElement("button");
        chipBtnNode.className = `category-chip-btn ${APP_STATE.currentSelectedCategory === catName ? 'active' : ''}`;
        chipBtnNode.innerText = catName;
        chipBtnNode.onclick = () => {
            document.querySelectorAll(".category-chip-btn").forEach(b => b.classList.remove("active"));
            chipBtnNode.classList.add("active");
            executeCategorizedInventoryFilterAction(catName);
        };
        targetsWrapperNode.appendChild(chipBtnNode);
    });
}

function toggleCategoryDrawer() {
    const targetNode = document.getElementById("category-items-container");
    APP_STATE.categoryDrawerOpen = !APP_STATE.categoryDrawerOpen;
    if(APP_STATE.categoryDrawerOpen) {
        targetNode.classList.remove("hidden");
    } else {
        targetNode.classList.add("hidden");
    }
}

function executeCategorizedInventoryFilterAction(categoryNameString) {
    APP_STATE.currentSelectedCategory = categoryNameString;
    const subheaderNode = document.getElementById("active-category-header");
    
    if(categoryNameString === 'Trending') {
        subheaderNode.classList.add("hidden-node");
    } else {
        subheaderNode.classList.remove("hidden-node");
        document.getElementById("category-title-text").innerText = categoryNameString;
    }
    renderMarketplaceProductsDisplayLoop();
}

function handleGlobalSearch(searchStringQuery) {
    APP_STATE.searchQuery = searchStringQuery.trim().toLowerCase();
    if(APP_STATE.activeViewPage === 'home') {
         renderMarketplaceProductsDisplayLoop();
    } else if(APP_STATE.activeViewPage === 'messages') {
         renderUserConversationsLogRoster();
    } else if(APP_STATE.activeViewPage === 'my-account') {
         executeFilteringSettingsContentPaneRowsNodesDisplay(APP_STATE.searchQuery);
    }
}

function handleCategorySearch(searchStringQuery) {
    APP_STATE.searchQuery = searchStringQuery.trim().toLowerCase();
    renderMarketplaceProductsDisplayLoop();
}

// Ensure foundational state variables exist safely
if (!SYSTEM_DATABASE.pinnedLeaderboard) {
    SYSTEM_DATABASE.pinnedLeaderboard = Array(20).fill(null); // Explicit 20-slot tracking architecture
}
if (SYSTEM_DATABASE.adminSlot === undefined) {
    SYSTEM_DATABASE.adminSlot = null; // High priority admin override slot
}

// ==========================================
// ADVERTISEMENT DATA SOURCES & DATA LOGIC
// ==========================================

// Ads displayed inside the Product Grid Loop
const gridAdsPool = [
    { type: 'image', header: 'Web Hosting Deals', text: 'Get high-speed cloud hosting today!', src: 'flyer-fort-landscape.png', url: 'https://fortdevelopers.com.ng' },
    { type: 'image', header: 'Graphic Design Hub', text: 'Professional flyers and logos made fast.', src: 'fort-graphics-logo.png', url: 'https://graphics.fort-site.com.ng' },
    { type: 'image', header: 'Custom Web Apps', text: 'Build scalable platforms with Fort Developers.', src: 'flyer-fort-2_ewnab_landscape.png', url: 'https://createawebsite.fortdevelopers.com.ng' },
    { type: 'image', header: 'E-commerce Solutions', text: 'Launch your store easily.', src: 'flyer-fort-landscape.png', url: 'https://createawebsite.fortdevelopers.com.ng' },
    { type: 'image', header: 'SEO Optimization', text: 'Rank top on search engines.', src: 'flyer-fort-landscape.png', url: 'https://blogs.fortdevelopers.com.ng' },
    { type: 'image', header: 'UI/UX Redesign', text: 'Modernize your brand identity.', src: 'fort-graphics-logo.png', url: 'https://graphics.fort-site.com.ng' },
    { type: 'image', header: 'Brand Identity Suite', text: 'Full branding packages available.', src: 'flyer-fort-landscape.png', url: 'https://graphics.fort-site.com.ng' },
    { type: 'image', header: 'Enterprise Software', text: 'Custom web platforms built for scale.', src: 'flyer-fort-2_ewnab_landscape.png', url: 'https://createawebsite.fortdevelopers.com.ng' }
];

// Ads displayed inside the 10% Sticky Footer Bar
const footerAdsPool = [
    { type: 'image', header: 'Sponsored: Fort Web Builder', text: 'Create your dream custom site.', src: 'flyer-fort-2_ewnab_landscape.png', url: 'https://createawebsite.fortdevelopers.com.ng' },
    { type: 'image', header: 'Sponsored: Fort Graphics', text: 'Get high quality e-flyers today.', src: 'fort-graphics-logo.png', url: 'https://graphics.fort-site.com.ng' },
    { type: 'image', header: 'Sponsored: Fort Dev Hub', text: 'Professional software engineering.', src: 'flyer-fort-landscape.png', url: 'https://fortdevelopers.com.ng' }
];

/**
 * Returns a sequential sequence of ads from an array, persisting index progress across refreshes.
 */
function getSequentialAdsChunk(adList, storageKey, countNeeded) {
    if (!adList || adList.length === 0) return [];

    let lastIndex = parseInt(localStorage.getItem(storageKey), 10);
    if (isNaN(lastIndex)) {
        lastIndex = -1;
    }

    const selectedAds = [];
    let currentIndex = lastIndex;

    for (let i = 0; i < countNeeded; i++) {
        currentIndex = (currentIndex + 1) % adList.length;
        selectedAds.push(adList[currentIndex]);
    }

    // Save the last rendered ad index for the next run
    localStorage.setItem(storageKey, currentIndex);
    return selectedAds;
}

// ==========================================
// MARKETPLACE GRID & INLINE ADS LOOP RENDER
// ==========================================

function renderMarketplaceProductsDisplayLoop() {
    const loopDisplayTargetGrid = document.getElementById("products-display-grid");
    if(!loopDisplayTargetGrid) return;
    
    loopDisplayTargetGrid.innerHTML = "";
    let baselineCurrencyIndicatorSymbol = "₦";
    let locationFilteringCriteriaString = "Nigeria";
    
    if(APP_STATE.currentUser) {
        locationFilteringCriteriaString = APP_STATE.currentUser.country;
        baselineCurrencyIndicatorSymbol = (APP_STATE.currentUser.country === 'Nigeria') ? '₦' : '$';
    }
    
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard || [];
    const adminSlotPid = SYSTEM_DATABASE.adminSlot;
    
    let computedInventoryOutputArray = SYSTEM_DATABASE.products.filter(item => {
        const structuralOwnerAccountPointer = SYSTEM_DATABASE.users.find(u => u.uid === item.ownerUid);
        if(!structuralOwnerAccountPointer) return false;
        if(structuralOwnerAccountPointer.country !== locationFilteringCriteriaString) return false;
        
        const isAdminSlotItem = Boolean(adminSlotPid && item.pid === adminSlotPid);

        if(!isAdminSlotItem && APP_STATE.currentSelectedCategory !== 'Trending' && item.category !== APP_STATE.currentSelectedCategory) {
            return false;
        }
        
        if(APP_STATE.searchQuery !== '') {
            const matchTitleFlag = item.name.toLowerCase().includes(APP_STATE.searchQuery);
            const matchInfoFlag = item.info.toLowerCase().includes(APP_STATE.searchQuery);
            if(!matchTitleFlag && !matchInfoFlag) return false;
        }
        return true;
    });

    let adminPinnedItem = computedInventoryOutputArray.filter(item => item.pid === adminSlotPid);
    let pinnedItems = computedInventoryOutputArray.filter(item => leaderboard.includes(item.pid) && item.pid !== adminSlotPid);
    let normalItems = computedInventoryOutputArray.filter(item => !leaderboard.includes(item.pid) && item.pid !== adminSlotPid);

    pinnedItems.sort((first, second) => leaderboard.indexOf(first.pid) - leaderboard.indexOf(second.pid));
    normalItems.sort((first, second) => (second.clickCount || 0) - (first.clickCount || 0));

    let combinedFilteredOutput = [...adminPinnedItem, ...pinnedItems, ...normalItems];
    let displayArrayToProcess = [...combinedFilteredOutput];
    
    if(displayArrayToProcess.length < 20) {
        let backfillDeficitCount = 20 - displayArrayToProcess.length;
        const structuralExternalAffiliateSourcesNamesArray = ["Jumia Hub Feed", "Temu Global Logistic Feed", "Jiji Local Ad Scraping Matrix", "Konga Digital Marketplace Warehouse"];
        for(let idx = 0; idx < backfillDeficitCount; idx++) {
            let sourcePointerString = structuralExternalAffiliateSourcesNamesArray[idx % structuralExternalAffiliateSourcesNamesArray.length];
            displayArrayToProcess.push({
                pid: `ext_mock_${idx}`,
                ownerUid: "admin",
                name: `[Affiliate External Entity - ${sourcePointerString}] Standard Retail Inventory Match Log Unit #${1042 + idx}`,
                category: APP_STATE.currentSelectedCategory,
                info: "Synchronized fallback inventory data stream pulled from global merchant network endpoints channels tracking configurations metrics models.",
                price: parseFloat(2250 * (idx + 3)),
                coverPhoto: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e0'><path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z'/></svg>",
                aiInfo: "External cross-network catalog matrix item profile baseline validation data structure trace.",
                clickCount: 12,
                isExternalAffiliateNodeFlag: true
            });
        }
    }
    
    // Calculate how many ads are required (1 ad per 4 products)
    const totalAdsNeeded = Math.floor(displayArrayToProcess.length / 4);
    const adsToInject = getSequentialAdsChunk(gridAdsPool, 'lastGridAdIndex', totalAdsNeeded);
    let adPointer = 0;

    displayArrayToProcess.forEach((product, index) => {
        const contextualOwnerRecord = SYSTEM_DATABASE.users.find(u => u.uid === product.ownerUid);
        const ownerCorporateEntityLabel = contextualOwnerRecord ? contextualOwnerRecord.businessName : "External Distribution Global Network Services Partner Hub";
        const ownerCircularAvatarSrcString = (contextualOwnerRecord && contextualOwnerRecord.avatar) ? contextualOwnerRecord.avatar : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23718096'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
        
        const cardContainerBlockElement = document.createElement("div");
        cardContainerBlockElement.className = "product-item-card-container rounded-rect";
        
        const isProductAdminPinned = (product.pid === adminSlotPid);
        const isProductPinned = leaderboard.includes(product.pid);
        
        let pinnedBadgeHTML = '';
        if (isProductAdminPinned) {
            pinnedBadgeHTML = `<span style="background:crimson; color:white; padding:2px 8px; font-size:0.7rem; border-radius:4px; font-weight:bold; margin-left:auto;">👑</span>`;
        } else if (isProductPinned) {
            pinnedBadgeHTML = `<span style="background:var(--fort-blue-light); color:white; padding:2px 8px; font-size:0.7rem; border-radius:4px; font-weight:bold; margin-left:auto;">📌</span>`;
        }
            
        cardContainerBlockElement.innerHTML = `
            <div class="poster-profile-strip" onclick="event.stopPropagation(); launchDetailedUserProfileContextOverlaySummaryModal('${product.ownerUid}');">
                <img class="mini-profile-avatar circle-container" src="${ownerCircularAvatarSrcString}" alt="Avatar">
                <span class="mini-profile-business-name">${ownerCorporateEntityLabel}</span>
                ${pinnedBadgeHTML}
            </div>
            <div class="product-card-image-box" onclick="launchComprehensiveProductSpecificationsExpandedModalView('${product.pid}')">
                <img src="${product.coverPhoto}" alt="Inventory Core Component Render">
            </div>
            <div class="product-card-details-block" onclick="launchComprehensiveProductSpecificationsExpandedModalView('${product.pid}')">
                <h4 class="product-card-title">${product.name}</h4>
                <p class="product-card-description">${product.info.substring(0, 100)}</p>
                <div class="product-card-price-tag">${baselineCurrencyIndicatorSymbol}${product.price.toLocaleString()}</div>
                <div class="btn-group" style="margin-top:auto;">
                    ${product.isExternalAffiliateNodeFlag ?
                        `<button class="btn-gray" style="width:100%; font-size:0.8rem;" onclick="event.stopPropagation(); alert('Redirecting external processing pipelines traces safely to affiliate endpoints portals.')">Visit Merchant Channel Portal</button>` :
                        `<button class="btn-blue" style="width:100%; font-size:0.8rem;" onclick="event.stopPropagation(); initialDirectMessageCommunicationPipelineSetup('${product.ownerUid}')">Message Seller</button>`
                    }
                </div>
            </div>
        `;
        loopDisplayTargetGrid.appendChild(cardContainerBlockElement);

        // Inject 1 Ad Container card every 4 products
        if ((index + 1) % 4 === 0 && adPointer < adsToInject.length) {
            const currentAd = adsToInject[adPointer];
            const adCardElement = document.createElement("div");
            adCardElement.className = "product-item-card-container rounded-rect ad-card-item";
            
            let adMediaHTML = (currentAd.type === 'video')
                ? `<video src="${currentAd.src}" autoplay muted loop playsinline></video>`
                : `<img src="${currentAd.src}" alt="${currentAd.header}">`;

            adCardElement.innerHTML = `
                <span class="ad-card-badge">Sponsored Ad</span>
                <h4 style="margin: 15px 0 5px 0; font-size:0.95rem; color:var(--fort-blue-dark);">${currentAd.header}</h4>
                <p style="font-size:0.8rem; color:#4a5568;">${currentAd.text}</p>
                <div class="ad-card-media-box">${adMediaHTML}</div>
                <button class="btn-blue" style="margin-top:10px; width:100%; font-size:0.8rem;" onclick="window.open('${currentAd.url}', '_blank', 'noopener,noreferrer')">Visit Site</button>
            `;
            loopDisplayTargetGrid.appendChild(adCardElement);
            adPointer++;
        }
    });
}

// ==========================================
// STICKY FOOTER ADVERTISEMENT ENGINE
// ==========================================

function setupFooterAdBar() {
    const footerContainer = document.getElementById("footer-ad-container");
    if (!footerContainer) return;

    // Fetch 1 ad from footer pool dynamically maintaining state sequence
    const [currentAd] = getSequentialAdsChunk(footerAdsPool, 'lastFooterAdIndex', 1);
    if (!currentAd) return;

    let mediaHTML = (currentAd.type === 'video')
        ? `<video src="${currentAd.src}" class="footer-ad-media" autoplay muted loop playsinline></video>`
        : `<img src="${currentAd.src}" alt="Ad" class="footer-ad-media">`;

    footerContainer.innerHTML = `
        <div class="footer-ad-content" onclick="window.open('${currentAd.url}', '_blank', 'noopener,noreferrer')">
            ${mediaHTML}
            <div class="footer-ad-text-block">
                <h4 class="footer-ad-title">${currentAd.header}</h4>
                <p class="footer-ad-desc">${currentAd.text}</p>
            </div>
            <span class="footer-ad-badge">Ad</span>
        </div>
    `;
}

// Ensure the footer ad setup runs alongside dom ready
window.addEventListener('DOMContentLoaded', () => {
    setupFooterAdBar();
});

/**
 * Dedicated helper function to increment hit count and save to web storage
 */
function recordProductHitCount(productIdTokenKey) {
    const targetedProduct = SYSTEM_DATABASE.products.find(p => p.pid === productIdTokenKey);
    if (targetedProduct) {
        targetedProduct.clickCount = (targetedProduct.clickCount || 0) + 1;
        syncPlatformDatabaseStateToWebStorage();
    }
}

/**
 * Utility: Converts strings to URL-friendly slugs
 */
function createProductSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Native Share handler for product modal
 */
async function shareProductModalDetails(productId) {
    const product = SYSTEM_DATABASE.products.find(p => p.pid === productId) || {
        pid: productId,
        name: "Synchronized Affiliate System Feed"
    };

    const targetModal = document.getElementById("product-detail-modal-body");
    if (!targetModal) return;

// 1. Create a clone to generate the exact specs image in Desktop view
    const clone = targetModal.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    
    // Force fixed desktop dimensions
    const DESKTOP_WIDTH = 1000;
    clone.style.width = `${DESKTOP_WIDTH}px`;
    clone.style.backgroundColor = "#ffffff";
    clone.style.padding = "20px";
    clone.style.borderRadius = "8px";
    
    // Modify elements per specification
    const headerTitle = clone.querySelector(".modal-title");
    if (headerTitle) {
        headerTitle.textContent = "Product Details - Fort Mart";
    }

    const closeBtn = clone.querySelector(".modal-close-icon-btn");
    if (closeBtn) closeBtn.remove();

    const actionsFooter = clone.querySelector(".modal-expanded-actions-footer-row");
    if (actionsFooter) actionsFooter.remove();

    const adminControls = clone.querySelector(".admin-controls-hub-box");
    if (adminControls) adminControls.remove();

    // Append 'Visit mart.fort-site.com.ng' to indicated left-column area
    const leftColumn = clone.querySelector(".expanded-left-visuals-column");
    if (leftColumn) {
        const visitTag = document.createElement("div");
        visitTag.style.marginTop = "15px";
        visitTag.style.fontWeight = "bold";
        visitTag.style.color = "#1a365d";
        visitTag.style.fontSize = "14px";
        visitTag.textContent = "Visit mart.fort-site.com.ng";
        leftColumn.appendChild(visitTag);
    }

    document.body.appendChild(clone);

    try {
        // Ensure html2canvas is loaded
        if (typeof html2canvas === "undefined") {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // Render canvas using desktop width and window viewport emulation
        const canvas = await html2canvas(clone, { 
            useCORS: true, 
            logging: false,
            width: DESKTOP_WIDTH,
            windowWidth: 1200
        });
        document.body.removeChild(clone);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const imageFileName = `${createProductSlug(product.name)}.png`;
        const imageFile = new File([blob], imageFileName, { type: 'image/png' });

        const productSlug = createProductSlug(product.name);
        const shareUrl = `${window.location.origin}${window.location.pathname}?product=${productSlug}&pid=${product.pid}`;
        const shareText = `${shareUrl}\n${product.name} | Fort Mart\nThis product was shared from Fort Mart - mart.fort-site.com.ng`;

        // Check if browser/OS supports file sharing (Mobile & modern Web Share supported OS)
        if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            await navigator.share({
                title: `${product.name} | Fort Mart`,
                text: shareText,
                files: [imageFile]
            });
        } else if (navigator.share) {
            // Standard link sharing if file payload is rejected by desktop OS
            await navigator.share({
                title: `${product.name} | Fort Mart`,
                text: shareText,
                url: shareUrl
            });
        } else {
            // Desktop Windows/Browser Fallback: Copy share text and download the generated spec image
            await navigator.clipboard.writeText(shareText);

            const downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = imageFileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);

            alert("Share message copied to clipboard and product specifications image downloaded!");
        }
    } catch (error) {
        if (document.body.contains(clone)) {
            document.body.removeChild(clone);
        }
        console.error("Error sharing product:", error);
    }
}

function launchComprehensiveProductSpecificationsExpandedModalView(productIdTokenKey, pushHistory = true) {
    if (!APP_STATE.currentUser) {
        triggerAuthenticationModalSequence();
        return;
    }

    recordProductHitCount(productIdTokenKey);

    let targetedProductItemMatch = SYSTEM_DATABASE.products.find(p => p.pid === productIdTokenKey);
    if (!targetedProductItemMatch) {
        targetedProductItemMatch = {
            pid: productIdTokenKey, 
            ownerUid: "admin", 
            name: "Synchronized Affiliate System Feed Record", 
            category: "General Ledger", 
            info: "Fallback inventory trace mapping record placeholder data structural component metrics analysis logs references.", 
            price: 12500, 
            coverPhoto: "", 
            aiInfo: "External baseline mapping tracking references model arrays values.", 
            clickCount: 1
        };
    }

    // 1. Dynamic Page Title Update
    document.title = `${targetedProductItemMatch.name} | Fort Mart`;

    // 2. Dynamic URL Update
    if (pushHistory) {
        const productSlug = createProductSlug(targetedProductItemMatch.name);
        const newUrl = `${window.location.origin}${window.location.pathname}?product=${productSlug}&pid=${targetedProductItemMatch.pid}`;
        window.history.pushState({ pid: targetedProductItemMatch.pid }, "", newUrl);
    }

    // 3. Render Product Info
    const operationalTargetProfileOwnerRecord = SYSTEM_DATABASE.users.find(u => u.uid === targetedProductItemMatch.ownerUid);
    const detailOverlayBodyNode = document.getElementById("product-detail-modal-body");
    const baselineCurrencySymbolSign = (APP_STATE.currentUser && APP_STATE.currentUser.country === 'Nigeria') ? '₦' : '$';

    let operationalActionControlsLayoutStringHTML = "";
    if (APP_STATE.currentUser && APP_STATE.currentUser.uid === targetedProductItemMatch.ownerUid) {
        operationalActionControlsLayoutStringHTML = `
            <button class="btn-gray full-width" onclick="switchSettingsSection('my-products'); navigateToPage('my-account'); closeProductSpecificationOverlay();">⚙️ Manage Products</button>
        `;
    } else {
        operationalActionControlsLayoutStringHTML = `
            <button class="btn-blue full-width" onclick="initialDirectMessageCommunicationPipelineSetup('${targetedProductItemMatch.ownerUid}'); closeProductSpecificationOverlay();">💬 Message Seller</button>
        `;
    }

    // Admin Controls Block
    let adminPinControlHTML = "";
    const isUserAdmin = (APP_STATE.currentUser.uid === 'admin' || APP_STATE.currentUser.id === 'admin');
    if (isUserAdmin) {
        const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard || [];
        const isCurrentPinned = leaderboard.includes(targetedProductItemMatch.pid);
        const isAdminSlotOccupant = (SYSTEM_DATABASE.adminSlot === targetedProductItemMatch.pid);

        adminPinControlHTML = `
            <div class="admin-controls-hub-box">
                <span class="admin-controls-title">🛡️ Admin Controls Hub</span>
                <div class="admin-controls-btn-row">
                    <button class="${isCurrentPinned ? 'btn-gray' : 'btn-blue'} admin-btn" onclick="executeToggleProductPinState('${targetedProductItemMatch.pid}')">
                        ${isCurrentPinned ? '🛑 Unpin Standard Slot' : '📌 Pin to Standard'}
                    </button>
                    <button class="${isAdminSlotOccupant ? 'btn-danger' : 'btn-success'} admin-btn admin-btn-slot" style="background: ${isAdminSlotOccupant ? 'crimson':'green'};" onclick="toggleAdminExclusiveSlotState('${targetedProductItemMatch.pid}')">
                        ${isAdminSlotOccupant ? '❌ Unassign Admin Slot' : '👑 Assign Admin Slot'}
                    </button>
                </div>
            </div>
        `;
    }

    const coverPhotoSrc = targetedProductItemMatch.coverPhoto || 'assets/placeholder-product.png';

    // 4. Exact HTML layout matching Expected.PNG
    detailOverlayBodyNode.innerHTML = `
        <div class="modal-expanded-header-row">
            <h3 class="modal-title">Product Details</h3>
            <button class="modal-close-icon-btn" onclick="closeProductSpecificationOverlay()">✕</button>
        </div>
        <div class="modal-expanded-content-split-grid margin-top-md">
            <div class="expanded-left-visuals-column">
                <div class="expanded-master-image-box rounded-rect">
                    <img src="${coverPhotoSrc}" alt="${targetedProductItemMatch.name}">
                </div>
            </div>
            <div class="expanded-right-details-column">
                <div class="vendor-profile-summary-row">
                    <img src="${(operationalTargetProfileOwnerRecord && operationalTargetProfileOwnerRecord.avatar) ? operationalTargetProfileOwnerRecord.avatar : 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23a0aec0\'><path d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z\'/></svg>'}" class="circle-container vendor-avatar-img" alt="Vendor Profile">
                    <div>
                        <h4 class="vendor-business-name">${operationalTargetProfileOwnerRecord ? operationalTargetProfileOwnerRecord.businessName : 'Sarah Logistics & Supply'}</h4>
                        <span class="vendor-country-tag">Country: ${operationalTargetProfileOwnerRecord ? operationalTargetProfileOwnerRecord.country : 'Nigeria'}</span>
                    </div>
                </div>

                <h2 class="product-title-text">${targetedProductItemMatch.name}</h2>
                <div class="product-price-tag">${baselineCurrencySymbolSign}${targetedProductItemMatch.price.toLocaleString()}</div>

                <div class="spec-note-paragraph-block">
                    <h5 class="spec-section-label">PRIMARY DESCRIPTIVE SUMMARY LOGS</h5>
                    <p class="spec-section-body">${targetedProductItemMatch.info}</p>
                </div>

                <div class="spec-note-paragraph-block">
                    <h5 class="spec-section-label">MORE INFO AND SPECIFICATIONS</h5>
                    <p class="spec-section-body spec-ai-info">${targetedProductItemMatch.aiInfo || 'No details specified.'}</p>
                </div>

                ${adminPinControlHTML}

                <div class="modal-expanded-actions-footer-row" style="display: flex; gap: 10px;">
                    ${operationalActionControlsLayoutStringHTML}
                    <button class="btn-green full-width" onclick="shareProductModalDetails('${targetedProductItemMatch.pid}')">🔗 Share</button>
                </div>
            </div>
        </div>
    `;

    // 5. Display Modal
    const productModal = document.getElementById("product-detail-modal");
    if (productModal) {
        productModal.classList.add("active");
    }
}

/**
 * Helper to close the product detail overlay and clean up URL history if needed
 */
function closeProductSpecificationOverlay() {
    closeActiveModalDirectly("product-detail-modal");
    
    // Reset title back to default
    document.title = "Fort Mart - Marketplace & Chat";
    
    // Clean query params from the URL bar
    if (window.location.search) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.pushState({}, "", cleanUrl);
    }
}

/**
 * URL Routing Handler
 */
async function handleProductUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('pid');
    const uid = urlParams.get('uid');

    if (pid) {
        await launchComprehensiveProductSpecificationsExpandedModalView(pid, false);
    } else if (uid) {
        launchDetailedUserProfileContextOverlaySummaryModal(uid, false);
    } else {
        const modal = document.getElementById("product-detail-modal");
        if (modal && modal.classList.contains("active")) {
            modal.classList.remove("active");
            document.title = "Fort Mart - Marketplace & Chat";
        }
        // Clean query params from the URL bar
        if (window.location.search) {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.pushState({}, "", cleanUrl);
        }
    }
}

// Browser navigation listener
window.addEventListener("popstate", () => {
    handleProductUrlRouting();
});

// Run routing check on application load
window.addEventListener("DOMContentLoaded", () => {
    handleProductUrlRouting();
});

function toggleAdminExclusiveSlotState(pid) {
    if (SYSTEM_DATABASE.adminSlot === pid) {
        SYSTEM_DATABASE.adminSlot = null;
        showTopRightToast("Admin slot unassigned successfully.", "error");
    } else {
        SYSTEM_DATABASE.adminSlot = pid;
        showTopRightToast("Admin slot assigned to this product exclusively.", "success");
    }
    administrativeSaveAndRefreshDisplay(pid);
}

/**
 * Action execution function modifying pin placement parameter assignments fields on target listings 
 */
function executeToggleProductPinState(productIdKey) {
    if (!SYSTEM_DATABASE.pinnedLeaderboard) {
        SYSTEM_DATABASE.pinnedLeaderboard = [];
    }
    
    const indexLocation = SYSTEM_DATABASE.pinnedLeaderboard.indexOf(productIdKey);
    
    if (indexLocation > -1) {
        // Product is pinned: unpin it by removing it from leaderboard
        SYSTEM_DATABASE.pinnedLeaderboard.splice(indexLocation, 1);
    } else {
        // Product is not pinned: append it to leaderboard if slots are available
        if (SYSTEM_DATABASE.pinnedLeaderboard.length >= 20) {
            showTopRightToast("Administrative Action Blocked: The leaderboard has hit its maximum limit of 20 slots.", "error");
            return;
        }
        SYSTEM_DATABASE.pinnedLeaderboard.push(productIdKey);
    }

    // Sync modifications down into data storage layer configurations
    administrativeSaveAndRefreshDisplay(productIdKey);
}

/**
 * Instantiates or ensures structural existence of leaderboard modal window frames
 */
function ensureLeaderboardModalHTMLExists() {
    if (document.getElementById("pinned-leaderboard-modal")) return;

    const modalWrapperNode = document.createElement("div");
    modalWrapperNode.id = "pinned-leaderboard-modal";
    modalWrapperNode.className = "universal-modal-container-wrapper"; // Assumes your style layout uses an '.active' class
    modalWrapperNode.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: none; align-items: center;
        justify-content: center; z-index: 10000; padding: 20px;
    `;

    modalWrapperNode.innerHTML = `
        <div style="background: white; width: 100%; max-width: 550px; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; max-height: 85vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                <h3 style="margin: 0; color: var(--fort-blue-dark);">🏆 Pinned Products Leaderboard (20 Slots)</h3>
                <button onclick="closeActiveModalDirectly('pinned-leaderboard-modal')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer;">✕</button>
            </div>
            <div id="leaderboard-slots-container" style="overflow-y: auto; margin-top: 15px; flex: 1; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                </div>
        </div>
    `;
    document.body.appendChild(modalWrapperNode);
}

// Global active element index state pointer tracking variables
let trackingActiveSelectedLeaderboardPid = null;

/**
 * Renders list items mapping loop records indices details inside the leaderboard view
 */
function launchPinnedProductsLeaderboardModal() {
    ensureLeaderboardModalHTMLExists();
    
    const container = document.getElementById("leaderboard-slots-container");
    container.innerHTML = "";
    
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard || [];
    
    if (leaderboard.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #718096; font-size: 0.9rem; margin: 20px 0;">No items are currently pinned to the leaderboard.</p>`;
    } else {
        leaderboard.forEach((pid, index) => {
            const product = SYSTEM_DATABASE.products.find(p => p.pid === pid);
            const isSelected = (trackingActiveSelectedLeaderboardPid === pid);
            
            const slotRowElement = document.createElement("div");
            slotRowElement.style.cssText = `
                border: 1px solid ${isSelected ? 'var(--fort-blue-primary)' : '#e2e8f0'};
                border-radius: 6px; padding: 10px; background: ${isSelected ? '#f7fafc' : 'white'};
                cursor: pointer; display: flex; flex-direction: column; gap: 8px;
            `;
            slotRowElement.onclick = () => {
                trackingActiveSelectedLeaderboardPid = isSelected ? null : pid;
                launchPinnedProductsLeaderboardModal();
            };
            
            // Handle missing fallback traces securely
            const titleText = product ? product.name : `[Unknown/Deleted Product ID: ${pid}]`;
            const clickCountInfo = product ? `(${product.clickCount || 0} views)` : '';
            
            let actionButtonsBarHTML = "";
            if (isSelected) {
                actionButtonsBarHTML = `
                    <div style="display: flex; gap: 6px; margin-top: 4px;" onclick="event.stopPropagation();">
                        <button class="btn-blue" style="flex: 1; padding: 4px; font-size: 0.75rem; font-weight: bold;" onclick="shiftLeaderboardRankPosition('${pid}', -1)">▲ Move Up</button>
                        <button class="btn-blue" style="flex: 1; padding: 4px; font-size: 0.75rem; font-weight: bold;" onclick="shiftLeaderboardRankPosition('${pid}', 1)">▼ Move Down</button>
                        <button class="btn-gray" style="flex: 1; padding: 4px; font-size: 0.75rem; font-weight: bold; background: #fed7d7; color: #c53030; border: 1px solid #feb2b2;" onclick="removeLeaderboardItemDirectly('${pid}')">🗑️ Remove</button>
                    </div>
                `;
            }
            
            slotRowElement.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.88rem;">
                    <div style="font-weight: bold; color: var(--fort-blue-light); display: flex; gap: 8px;">
                        <span>#${index + 1}</span>
                        <span style="color: #2d3748; font-weight: 500; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleText}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: #a0aec0;">${clickCountInfo}</span>
                </div>
                ${actionButtonsBarHTML}
            `;
            container.appendChild(slotRowElement);
        });
    }
    
    document.getElementById("pinned-leaderboard-modal").style.display = "flex";
}

/**
 * Changes rank index ordering position up or down inside leaderboard tracking fields arrays
 */
function shiftLeaderboardRankPosition(pid, directionalDeltaIndex) {
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard || [];
    const targetIndex = leaderboard.indexOf(pid);
    
    if (targetIndex === -1) return;
    
    const computedNewPositionIndex = targetIndex + directionalDeltaIndex;
    
    // Bounds limit checks
    if (computedNewPositionIndex < 0 || computedNewPositionIndex >= leaderboard.length) return;
    
    // Swap array position keys elements
    let temporaryHolderPlaceholder = leaderboard[targetIndex];
    leaderboard[targetIndex] = leaderboard[computedNewPositionIndex];
    leaderboard[computedNewPositionIndex] = temporaryHolderPlaceholder;
    
    // Sync adjustments down across databases
    administrativeSaveAndRefreshDisplay();
    launchPinnedProductsLeaderboardModal();
}

/**
 * Removes a product code identifier sequence directly from pinned rankings arrays
 */
function removeLeaderboardItemDirectly(pid) {
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard || [];
    const index = leaderboard.indexOf(pid);
    
    if (index > -1) {
        leaderboard.splice(index, 1);
        if (trackingActiveSelectedLeaderboardPid === pid) {
            trackingActiveSelectedLeaderboardPid = null;
        }
        
        administrativeSaveAndRefreshDisplay(pid);
        launchPinnedProductsLeaderboardModal();
    }
}

/**
 * Overrides modal dismissal tracking utility hooks seamlessly
 */
const baselineCloseActiveModalDirectly = window.closeActiveModalDirectly;
window.closeActiveModalDirectly = function(modalIdString) {
    if (modalIdString === 'pinned-leaderboard-modal') {
        const modal = document.getElementById("pinned-leaderboard-modal");
        if (modal) modal.style.display = "none";
        return;
    }
    
    if (typeof baselineCloseActiveModalDirectly === "function") {
        baselineCloseActiveModalDirectly(modalIdString);
    } else {
        const structuralModalNode = document.getElementById(modalIdString);
        if (structuralModalNode) structuralModalNode.classList.remove("active");
    }
};

/**
 * Messenger Communications Infrastructure Core System Engine Processing Architecture Module
 */
function renderUserConversationsLogRoster() {
    const logContainerTargetNode = document.getElementById("chat-threads-target-list");
    if(!logContainerTargetNode) return;
    
    logContainerTargetNode.innerHTML = "";
    
    if(!APP_STATE.currentUser) return;
    
    // --- FEATURE: SPECIAL ADMIN BROADCAST CHANNEL CONTROLS ---
    if (APP_STATE.currentUser.uid === 'admin') {
        // Render All Personal Accounts Node Channel
        const personalBroadcastNode = document.createElement("div");
        personalBroadcastNode.className = `chat-thread-roster-row broadcast-system-node ${APP_STATE.activeChatTargetUserHash === 'broadcast_personal' ? 'active' : ''}`;
        personalBroadcastNode.onclick = () => activateMessengerConversationWorkspaceSessionBlock('broadcast_personal');
        personalBroadcastNode.innerHTML = `
            <div class="circle-container" style="width:38px; height:38px; background-color:#3182ce; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:1.1rem;">📢</div>
            <div style="flex:1; overflow:hidden;">
                <h5 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#2b6cb0; font-weight:800;">[ALL PERSONAL ACCOUNTS]</h5>
                <p style="font-size:0.78rem; color:var(--fort-gray-slate); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">System Broadcast Console Terminal</p>
            </div>
        `;
        logContainerTargetNode.appendChild(personalBroadcastNode);

        // Render All Business Accounts Node Channel
        const businessBroadcastNode = document.createElement("div");
        businessBroadcastNode.className = `chat-thread-roster-row broadcast-system-node ${APP_STATE.activeChatTargetUserHash === 'broadcast_business' ? 'active' : ''}`;
        businessBroadcastNode.onclick = () => activateMessengerConversationWorkspaceSessionBlock('broadcast_business');
        businessBroadcastNode.innerHTML = `
            <div class="circle-container" style="width:38px; height:38px; background-color:#319795; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:1.1rem;">📢</div>
            <div style="flex:1; overflow:hidden;">
                <h5 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#234e52; font-weight:800;">[ALL BUSINESS ACCOUNTS]</h5>
                <p style="font-size:0.78rem; color:var(--fort-gray-slate); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">System Broadcast Console Terminal</p>
            </div>
        `;
        logContainerTargetNode.appendChild(businessBroadcastNode);
    }
    
    // Track matching historical stream records blocks inside systems execution memory databases maps sets
    const computedMatchingDialoguesArray = SYSTEM_DATABASE.chats.filter(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid));
    // --- FEATURE: RECENCY SORTING METHOD ---
    computedMatchingDialoguesArray.sort((a, b) => {
        const getLatestMessageTimeToken = (threadInstance) => {
            if (!threadInstance.messageLog || threadInstance.messageLog.length === 0) return 0;
            const lastMsg = threadInstance.messageLog[threadInstance.messageLog.length - 1];
            const numericExtractionMatch = lastMsg.mid.match(/\d+/);
            return numericExtractionMatch ? parseInt(numericExtractionMatch[0], 10) : 0;
        };
        return getLatestMessageTimeToken(b) - getLatestMessageTimeToken(a);
    });
    if(computedMatchingDialoguesArray.length === 0 && APP_STATE.currentUser.uid !== 'admin') {
        logContainerTargetNode.innerHTML = `<div class="text-center" style="padding:20px; color:var(--fort-gray-slate); font-size:0.85rem;"><p>No active history logs tracking conversation threads instances detected within specified regional parameters profile databases.</p></div>`;
        return;
    }
    
    computedMatchingDialoguesArray.forEach(thread => {
        const opposingParticipantUid = thread.dynamicParticipants.find(id => id !== APP_STATE.currentUser.uid);
        const opposingAccountRecord = SYSTEM_DATABASE.users.find(u => u.uid === opposingParticipantUid);
        
        if(!opposingAccountRecord) return;
        
        // Compute dynamic bracket strings layout suffixes explicitly matching business rule formulas
        let structuralLabelDisplayExpressionString = "";
    
        if(opposingAccountRecord.accountType === 'personal') {
            structuralLabelDisplayExpressionString = `${opposingAccountRecord.identityName} (Personal)`;
        } else {
            structuralLabelDisplayExpressionString = `${opposingAccountRecord.businessName} (Business) – ${opposingAccountRecord.identityName}`;
        }
        
        // Support and intercept operational filtering requests queries maps parameters directly via global navbar controllers
        if(APP_STATE.searchQuery !== '') {
            if(!structuralLabelDisplayExpressionString.toLowerCase().includes(APP_STATE.searchQuery)) return;
        }
        
        // Find last message not cleared or deleted by the user for list preview mapping
        const validUserLog = thread.messageLog.filter(msg => !msg.deletedBy || !msg.deletedBy.includes(APP_STATE.currentUser.uid));
        const lastMessageLogEntry = validUserLog[validUserLog.length - 1];
        let previewTextLineString = "Click thread node to initiate workspace session.";
        if (lastMessageLogEntry) {
            if (lastMessageLogEntry.isDeletedForAll) {
                previewTextLineString = "This message was deleted";
            } else if (lastMessageLogEntry.isFile) {
                if (lastMessageLogEntry.isImage) previewTextLineString = `📷 [Image] ${lastMessageLogEntry.text}`;
                else if (lastMessageLogEntry.isVideo) previewTextLineString = `🎥 [Video] ${lastMessageLogEntry.text}`;
                else previewTextLineString = `📁 [File] ${lastMessageLogEntry.text}`;
            } else {
                previewTextLineString = lastMessageLogEntry.text.substring(0, 35);
            }
        }
        
        const rowWrapperNodeElement = document.createElement("div");
        rowWrapperNodeElement.className = `chat-thread-roster-row ${APP_STATE.activeChatTargetUserHash === opposingParticipantUid ? 'active' : ''}`;
        rowWrapperNodeElement.onclick = () => activateMessengerConversationWorkspaceSessionBlock(opposingParticipantUid);
        rowWrapperNodeElement.innerHTML = `
            <img src="${opposingAccountRecord.avatar || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23718096\'><path d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z\'/></svg>'}" class="mini-profile-avatar circle-container" style="width:38px; height:38px;" alt="Avatar">
            <div style="flex:1; overflow:hidden;">
                <h5 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--fort-blue-dark); font-weight:700;">${structuralLabelDisplayExpressionString}</h5>
                <p style="font-size:0.78rem; color:var(--fort-gray-slate); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${previewTextLineString}</p>
            </div>
        `;
        logContainerTargetNode.appendChild(rowWrapperNodeElement);
    });
}

function initialDirectMessageCommunicationPipelineSetup(targetVendorOwnerUidTokenKey) {
    if(!APP_STATE.currentUser) {
        triggerAuthenticationModalSequence();
        return;
    }
    if(APP_STATE.currentUser.uid === targetVendorOwnerUidTokenKey) {
        showTopRightToast("You are the seller, and according to Fort Mart application protocols there is no message yourself feature.", "info");
        return;
    }
    
    const structuralTargetComboKeyArray = [APP_STATE.currentUser.uid, targetVendorOwnerUidTokenKey];
    let ongoingThreadMatchRecord = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(targetVendorOwnerUidTokenKey));
    
    if(!ongoingThreadMatchRecord) {
        ongoingThreadMatchRecord = {
            chatId: `chat_${APP_STATE.currentUser.uid}_${targetVendorOwnerUidTokenKey}`,
            dynamicParticipants: structuralTargetComboKeyArray,
            messageLog: []
        };
        SYSTEM_DATABASE.chats.push(ongoingThreadMatchRecord);
        syncPlatformDatabaseStateToWebStorage();
    }
    
    APP_STATE.activeChatTargetUserHash = targetVendorOwnerUidTokenKey;
    navigateToPage('messages');
    activateMessengerConversationWorkspaceSessionBlock(targetVendorOwnerUidTokenKey);
}

function activateMessengerConversationWorkspaceSessionBlock(targetCounterpartyUidValue) {
    APP_STATE.activeChatTargetUserHash = targetCounterpartyUidValue;
    
    document.getElementById("chat-pane-empty-notice").classList.add("hidden-node");
    const activeWorkspaceBlockNode = document.getElementById("chat-pane-active-view");
    activeWorkspaceBlockNode.classList.remove("hidden-node");
    document.getElementById("chat-conversation-pane")?.classList.add("phone-active-thread");
    if(APP_STATE.deviceMode === 'phone') {
         document.getElementById("chat-conversation-pane").classList.add("phone-active-thread");
    }

    const targetToolbarNodeElement = document.getElementById("chat-window-top-toolbar");
    if (targetCounterpartyUidValue === 'broadcast_personal' || targetCounterpartyUidValue === 'broadcast_business') {
        const headlineLabel = targetCounterpartyUidValue === 'broadcast_personal' ?
            'Broadcast to All Personal Accounts' : 'Broadcast to All Business Accounts';
        targetToolbarNodeElement.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; width:100%; justify-content:space-between; background-color: #2c5282; color:var(--fort-white-pure); padding:8px 14px;" class="rounded-rect">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:700; font-size:0.95rem;">📢 ${headlineLabel}</span>
                </div>
            </div>
        `;
    } else {
        const counterpartyUserRecord = SYSTEM_DATABASE.users.find(u => u.uid === targetCounterpartyUidValue);
        targetToolbarNodeElement.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; width:100%; justify-content:space-between; background-color: var(--fort-blue-primary); color:var(--fort-white-pure); padding:8px 14px;" class="rounded-rect">
                <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="launchDetailedUserProfileContextOverlaySummaryModal('${targetCounterpartyUidValue}')">
                    <button onclick="event.stopPropagation(); closePhoneConversationOverlayViewBlock()" class="mobile-close-chat-btn" style="background:none; border:none; color:#fff; font-size:1.3rem; margin-right:8px; padding: 0 5px; cursor:pointer;">
                        ←
                    </button>
                    <img src="${counterpartyUserRecord.avatar || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23ffffff\'><path d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z\'/></svg>'}" style="width:32px; height:32px;" class="circle-container" alt="User Avatar Image Context">
                    <span style="font-weight:600; font-size:0.9rem;">${counterpartyUserRecord.identityName}</span>
                </div>
                <div class="toolbar-buttons-sets" style="display:flex; gap:8px;">
                    <button class="btn-danger" style="padding:4px 10px; font-size:0.75rem;" onclick="executeWipeEntireDialogueLogsHistoryContextChain()">Clear Chat</button>
                </div>
            </div>
        `;
    }

    refreshMessengerActiveStreamBubblesDisplayList();
}

function closePhoneConversationOverlayViewBlock() {
    document.getElementById("chat-conversation-pane")?.classList.remove("phone-active-thread");
    document.getElementById("chat-conversation-pane").classList.remove("phone-active-thread");
    APP_STATE.activeChatTargetUserHash = null;
    renderUserConversationsLogRoster();
}    

function refreshMessengerActiveStreamBubblesDisplayList() {
    const streamTargetBoxNode = document.getElementById("chat-bubble-stream-area");
    if(!streamTargetBoxNode) return;
    
    streamTargetBoxNode.innerHTML = "";
    
    if(!APP_STATE.activeChatTargetUserHash || !APP_STATE.currentUser) return;
    
    if (APP_STATE.activeChatTargetUserHash === 'broadcast_personal' || APP_STATE.activeChatTargetUserHash === 'broadcast_business') {
        streamTargetBoxNode.innerHTML = `<div class='empty-placeholder' style='align-self:center; margin:auto;'><p style='color:#2b6cb0; font-size:0.88rem; font-weight:600;'>System Broadcast Terminal Mode Active.<br><span style='font-weight:400; color:var(--fort-gray-slate); font-size:0.8rem;'>Messages pushed through this form pipeline will automatically populate all designated account communication channels.</span></p></div>`;
        return;
    }
    
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if(!operationalThreadRecordData || operationalThreadRecordData.messageLog.length === 0) {
        streamTargetBoxNode.innerHTML = `<div class='empty-placeholder' style='align-self:center; margin:auto;'><p style='color:var(--fort-gray-slate); font-size:0.85rem;'>Dialogue stream initialized. Type message lines below to execute securely transmitted communication.</p></div>`;
        return;
    }
    
    operationalThreadRecordData.messageLog.forEach(msg => {
        if (msg.deletedBy && msg.deletedBy.includes(APP_STATE.currentUser.uid)) return;

        const outboundFlagCondition = msg.senderUid === APP_STATE.currentUser.uid;
        const failedTransmissionFlag = msg.status === 'failed';
        
        const bubbleWrapperElementNode = document.createElement("div");
        // Inject failed structural state layout rules
        bubbleWrapperElementNode.className = `chat-bubble-node rounded-rect ${outboundFlagCondition ? 'outgoing-msg' : 'incoming-msg'} ${failedTransmissionFlag ? 'transmission-failed-node' : ''}`;
        
        let dynamicTicksLayoutHTML = "";        
        let bodyLayoutHTML = "";
        let downloadControlHTML = "";
        
        if (msg.isDeletedForAll) {
            bodyLayoutHTML = `<p style="word-break:break-word; font-style:italic; opacity:0.75;">This message was deleted</p>`;
        } else if (msg.isFile) {
            if (msg.isImage) {
                bodyLayoutHTML = `
                    <div style="display: block;">
                        <img src="${msg.fileData}" class="msg-image-preview" style="max-width: 200px; max-height: 200px; border-radius: 6px; display: block; margin-bottom: 4px;" alt="Image File Payload">
                        <p style="word-break:break-word; font-size:0.78rem; color:inherit; opacity:0.85; margin:0; display:flex; align-items:center; gap:4px;">🖼️ ${msg.text}</p>
                    </div>
                `;
            } else if (msg.isVideo) {
                bodyLayoutHTML = `
                    <div style="display: block; position: relative; max-width: 240px; border-radius: 6px; overflow: hidden; background: #000; margin-bottom: 4px;">
                        <video src="${msg.fileData}" style="width: 100%; height: auto; display: block; pointer-events: none;" preload="metadata"></video>
                        <div style="position: absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.35);">
                            <span style="font-size: 2rem; color: #fff; opacity: 0.85;">▶</span>
                        </div>
                     </div>
                    <p style="word-break:break-word; font-size:0.78rem; color:inherit; opacity:0.85; margin:0; display:flex; align-items:center; gap:4px;">🎥 ${msg.text}</p>
                `;
            } else {
                let documentBadgeSVGHTML = "";
                const absoluteFileExtensionToken = msg.text.split('.').pop().toLowerCase();
                
                if (absoluteFileExtensionToken === 'pdf') {
                    documentBadgeSVGHTML = `
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11.5 9.5C11.5 10.33 10.83 11 10 11H8.5V12.5H7V7H10C10.83 7 11.5 7.67 11.5 8.5V9.5ZM17 8.5C17 9.88 15.88 11 14.5 11H13V7H14.5C15.88 7 17 8.12 17 8.5ZM21 15H19.5V14H21V12.5H19.5V11.5H21V10H18V16H21V15Z" fill="#E53E3E"/>
                            <path d="M8.5 8.5H10V9.5H8.5V8.5ZM14.5 8.5H15.5V9.5H14.5V8.5Z" fill="#E53E3E"/>
                        </svg>`;
                } else if (absoluteFileExtensionToken === 'txt') {
                    documentBadgeSVGHTML = `
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;">
                            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#4A5568"/>
                        </svg>`;
                } else {
                    documentBadgeSVGHTML = `
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:2px;">
                            <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM12 18C9.79 18 8 16.21 8 14C8 11.79 9.79 10 12 10C14.21 10 16 11.79 16 14C16 16.21 14.21 18 12 18Z" fill="#3182CE"/>
                        </svg>`;
                }
                
                bodyLayoutHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 6px; min-width: 120px;">
                        ${documentBadgeSVGHTML}
                        <p style="word-break:break-word; font-weight:600; font-size:0.82rem; margin:4px 0 0 0; text-align:center;">${msg.text}</p>
                    </div>
                `;
            }
            if (!failedTransmissionFlag) {
                downloadControlHTML = `<button class="msg-action-btn" onclick="executeMessageFileDownloadTracker('${msg.mid}')">📥 Download</button>`;
            }
        } else {
            bodyLayoutHTML = `<p style="word-break:break-word;">${msg.text}</p>`;
        }
        
        // --- FEATURE: PURGE CONTROLS WITH VALIDITY RUNTIME EVALUATION ---
        let deleteForAllControlHTML = "";
        let retryControlHTML = "";
        
        if (failedTransmissionFlag) {
            retryControlHTML = `<button class="msg-action-btn" style="color:#e53e3e; font-weight:700;" onclick="executeRetryMessageTransmissionPipeline('${msg.mid}')">🔄 Retry</button>`;
        } else if (outboundFlagCondition && !msg.isDeletedForAll) {
            deleteForAllControlHTML = `<button class="msg-action-btn" style="color:#c53030; font-weight:700;" onclick="executeSelectedBubbleMessagePurgeForAll('${msg.mid}')">💥 Delete for All</button>`;
        }
        
        let actionControlsMenuHTML = "";
        if (!msg.isDeletedForAll) {
            actionControlsMenuHTML = `
                <div class="msg-hover-actions">
                    ${retryControlHTML}
                    <button class="msg-action-btn" onclick="executeMessageTextCopyClipboard('${msg.mid}')">📋 Copy</button>
                    ${downloadControlHTML}
                    <button class="msg-action-btn" style="color:#9b2c2c;" onclick="executeSelectedBubbleMessagePurge('${msg.mid}')">🗑️ Delete</button>
                    ${deleteForAllControlHTML}
                </div>
            `;
        }
        
        bubbleWrapperElementNode.innerHTML = `
            ${bodyLayoutHTML}
            <div class="msg-meta-row">
                <span>${msg.timestamp}</span> 
                <span>${msg.Date || ''}</span>
                ${dynamicTicksLayoutHTML}
            </div>
            ${actionControlsMenuHTML}
        `;
        streamTargetBoxNode.appendChild(bubbleWrapperElementNode);
    });
    
    streamTargetBoxNode.scrollTop = streamTargetBoxNode.scrollHeight;
}

function sendChatMessageDirect() {
    const textInputNodeElement = document.getElementById("chat-text-input-field");
    const enteredMessageTextString = textInputNodeElement.value.trim();
    if(enteredMessageTextString === "" || !APP_STATE.currentUser || !APP_STATE.activeChatTargetUserHash) return;
    
    // --- FEATURE: EXECUTE DISPATCH BROADCAST PROCESSOR PIPELINES ---
    if (APP_STATE.activeChatTargetUserHash === 'broadcast_personal' || APP_STATE.activeChatTargetUserHash === 'broadcast_business') {
        executeSystemWideBroadcastTransmission(enteredMessageTextString, null);
        textInputNodeElement.value = "";
        return;
    }
    
    if(APP_STATE.activeChatTargetUserHash === 'admin') {
         showTopRightToast("The Fort Mart profile can't be replied.", "info");
         textInputNodeElement.value = "";
         return;
    }
    
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if(operationalThreadRecordData) {
        // Simulating error flags toggle rule for development evaluation testing environments
        // To verify the failed state, you can manually push objects with status: "failed"
        const generatedMessageInstance = {
            mid: "m_" + Date.now(),
            senderUid: APP_STATE.currentUser.uid,
            text: enteredMessageTextString,
            timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        };
        
        operationalThreadRecordData.messageLog.push(generatedMessageInstance);
        textInputNodeElement.value = "";
        renderUserConversationsLogRoster();
        refreshMessengerActiveStreamBubblesDisplayList();
        syncPlatformDatabaseStateToWebStorage();
        
    }
}

// --- FEATURE: RETRY DISPATCH CHANNEL RE-TRIGGER PIPELINE ---
function executeRetryMessageTransmissionPipeline(messageIdentifierKey) {
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if (!operationalThreadRecordData) return;
    
    const targetFailedMessageNode = operationalThreadRecordData.messageLog.find(m => m.mid === messageIdentifierKey);
    if (targetFailedMessageNode && targetFailedMessageNode.status === 'failed') {
        targetFailedMessageNode.timestamp = new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        renderUserConversationsLogRoster();
        refreshMessengerActiveStreamBubblesDisplayList();
        syncPlatformDatabaseStateToWebStorage();
        
    }
}

/**
 * File System Interface Operations Hooks Definitions
 */
function triggerMessageAttachedFileBrowserLink() {
    const targetFileInputNode = document.getElementById("chat-message-file-attachment-input");
    if (targetFileInputNode) {
        targetFileInputNode.click();
    }
}

function handleMessageAttachedFileSelectionEvent(inputNodeContextElement) {
    if (!inputNodeContextElement.files || inputNodeContextElement.files.length === 0) return;
    if (!APP_STATE.currentUser || !APP_STATE.activeChatTargetUserHash) return;
    if (APP_STATE.activeChatTargetUserHash === 'admin') {
         showTopRightToast("The Fort Mart profile can't be replied.", "info");
         inputNodeContextElement.value = "";
         return;
    }
    
    const singleFileReference = inputNodeContextElement.files[0];
    const checkIsImageFormatCondition = singleFileReference.type.startsWith('image/');
    const checkIsVideoFormatCondition = singleFileReference.type.startsWith('video/');
    
    const fileStorageProcessingReader = new FileReader();
    
    fileStorageProcessingReader.onload = function(readerEvent) {
        const transportFilePayloadConfig = {
            isFile: true,
            isImage: checkIsImageFormatCondition,
            isVideo: checkIsVideoFormatCondition,
            fileData: readerEvent.target.result
        };

        if (APP_STATE.activeChatTargetUserHash === 'broadcast_personal' || APP_STATE.activeChatTargetUserHash === 'broadcast_business') {
            executeSystemWideBroadcastTransmission(singleFileReference.name, transportFilePayloadConfig);
            inputNodeContextElement.value = "";
            return;
        }

        const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
        if (operationalThreadRecordData) {
            operationalThreadRecordData.messageLog.push({
                mid: "m_file_" + Date.now(),
                senderUid: APP_STATE.currentUser.uid,
                text: singleFileReference.name,
                isFile: true,
                isImage: checkIsImageFormatCondition,
                isVideo: checkIsVideoFormatCondition,
                fileData: readerEvent.target.result,
                timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
            });
            inputNodeContextElement.value = "";
            renderUserConversationsLogRoster();
            refreshMessengerActiveStreamBubblesDisplayList();
            syncPlatformDatabaseStateToWebStorage();
            
        }
    };
    
    fileStorageProcessingReader.readAsDataURL(singleFileReference);
}

/**
 * --- FEATURE: ADMIN BROADCAST ROUTING SYSTEM ENGINE ---
 */
function executeSystemWideBroadcastTransmission(textPayloadString, filePackageConfigObject) {
    const targetGroupString = APP_STATE.activeChatTargetUserHash === 'broadcast_personal' ? 'personal' : 'business';
    const destinationAccountsArray = SYSTEM_DATABASE.users.filter(u => u.accountType === targetGroupString && u.uid !== 'admin');
    if (destinationAccountsArray.length === 0) {
        showTopRightToast("Broadcast processing aborted. There are no target accounts.", "error");
        return;
    }
    
    destinationAccountsArray.forEach((profileRecord, arrayIndex) => {
        let uniqueTargetThreadNode = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes('admin') && c.dynamicParticipants.includes(profileRecord.uid));
        
        if (!uniqueTargetThreadNode) {
            uniqueTargetThreadNode = {
                chatId: `chat_admin_${profileRecord.uid}`,
                dynamicParticipants: ['admin', profileRecord.uid],
                messageLog: []
            };
            SYSTEM_DATABASE.chats.push(uniqueTargetThreadNode);
        }
        
        const baseMessageData = {
            mid: `m_bcast_${Date.now()}_${arrayIndex}`,
            senderUid: 'admin',
            text: textPayloadString,
            timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        };
        if (filePackageConfigObject) {
            baseMessageData.isFile = filePackageConfigObject.isFile;
            baseMessageData.isImage = filePackageConfigObject.isImage;
            baseMessageData.isVideo = filePackageConfigObject.isVideo;
            baseMessageData.fileData = filePackageConfigObject.fileData;
        }
        
        uniqueTargetThreadNode.messageLog.push(baseMessageData);
    });
    
    showTopRightToast(`Broadcast routed successfully to all ${destinationAccountsArray.length} active ${targetGroupString} profile logs.`, "success");
    renderUserConversationsLogRoster();
    syncPlatformDatabaseStateToWebStorage();
}

function executeMessageTextCopyClipboard(messageIdentifierKey) {
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if (!operationalThreadRecordData) return;
    
    const exactMessagePayloadMatch = operationalThreadRecordData.messageLog.find(m => m.mid === messageIdentifierKey);
    if (exactMessagePayloadMatch) {
        navigator.clipboard.writeText(exactMessagePayloadMatch.text).catch(err => {
            console.error("System Matrix Clipboard Exception Handling Log:", err);
        });
    }

    showTopRightToast("Text Copied Successfully", "success");
}

// --- FEATURE: SINGLE-USER PERSISTENT SELECTION PURGE ---
function executeSelectedBubbleMessagePurge(messageIdentifierKey) {
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if (!operationalThreadRecordData) return;
    
    const exactMessagePayloadMatch = operationalThreadRecordData.messageLog.find(m => m.mid === messageIdentifierKey);
    if (exactMessagePayloadMatch) {
        if (!exactMessagePayloadMatch.deletedBy) {
            exactMessagePayloadMatch.deletedBy = [];
        }
        if (!exactMessagePayloadMatch.deletedBy.includes(APP_STATE.currentUser.uid)) {
            exactMessagePayloadMatch.deletedBy.push(APP_STATE.currentUser.uid);
        }
        syncPlatformDatabaseStateToWebStorage();
        renderUserConversationsLogRoster();
        refreshMessengerActiveStreamBubblesDisplayList();
    }
}

// --- FEATURE: DELETE FOR ALL MUTATION ROUTINE ---
function executeSelectedBubbleMessagePurgeForAll(messageIdentifierKey) {
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if (!operationalThreadRecordData) return;
    
    const exactMessagePayloadMatch = operationalThreadRecordData.messageLog.find(m => m.mid === messageIdentifierKey);
    if (exactMessagePayloadMatch) {
        // Replace base data parameters context while maintaining indices tracking nodes
        exactMessagePayloadMatch.text = "This message was deleted";
        exactMessagePayloadMatch.isDeletedForAll = true;
        
        // Clean attachment structures to safely bypass content layout rendering engines
        delete exactMessagePayloadMatch.isFile;
        delete exactMessagePayloadMatch.isImage;
        delete exactMessagePayloadMatch.isVideo;
        delete exactMessagePayloadMatch.fileData;
        
        syncPlatformDatabaseStateToWebStorage();
        renderUserConversationsLogRoster();
        refreshMessengerActiveStreamBubblesDisplayList();
    }
}

function executeMessageFileDownloadTracker(messageIdentifierKey) {
    const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash));
    if (!operationalThreadRecordData) return;
    const exactMessagePayloadMatch = operationalThreadRecordData.messageLog.find(m => m.mid === messageIdentifierKey);
    if (exactMessagePayloadMatch && exactMessagePayloadMatch.isFile && exactMessagePayloadMatch.fileData) {
        const structuralAnchorDownloadElement = document.createElement("a");
        structuralAnchorDownloadElement.href = exactMessagePayloadMatch.fileData;
        structuralAnchorDownloadElement.download = exactMessagePayloadMatch.text;
        document.body.appendChild(structuralAnchorDownloadElement);
        structuralAnchorDownloadElement.click();
        document.body.removeChild(structuralAnchorDownloadElement);
    }
}

function executeAutoReplyEvaluationProcessFrame(operationalThreadRecordData) {
    const counterpartyAccountProfile = SYSTEM_DATABASE.users.find(u => u.uid === APP_STATE.activeChatTargetUserHash);
    if(counterpartyAccountProfile && APP_STATE.activeChatTargetUserHash !== 'admin') {
        const totalOutboundLinesCount = operationalThreadRecordData.messageLog.filter(m => m.senderUid === APP_STATE.currentUser.uid).length;
        if(totalOutboundLinesCount === 1) {
            setTimeout(() => {
                operationalThreadRecordData.messageLog.push({
                    mid: "m_auto_" + Date.now(),
                    senderUid: counterpartyAccountProfile.uid,
                    text: `[Automated Assistant System Broadcast Response Mapping Engine Log]: Thank you for reaching out to ${counterpartyAccountProfile.businessName ||counterpartyAccountProfile.identityName }. Your commercial request lines have been safely indexed. We will get back to you soon.`,
                    timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
                });
 
                renderUserConversationsLogRoster();
                refreshMessengerActiveStreamBubblesDisplayList();
                syncPlatformDatabaseStateToWebStorage();
            }, 1500);
        }
    }
}

// --- FEATURE: CLEAR CHAT UNILATERAL RETENTION LOGIC ---
// --- FEATURE: CLEAR CHAT UNILATERAL RETENTION LOGIC ---
function executeWipeEntireDialogueLogsHistoryContextChain() {
    displayConfirmationModalOverlayAction("Are you sure you want to clear this chat?", () => {
        if (!APP_STATE.currentUser || !APP_STATE.activeChatTargetUserHash) return;

        const operationalThreadRecordData = SYSTEM_DATABASE.chats.find(c => 
            c.dynamicParticipants.includes(APP_STATE.currentUser.uid) && 
            c.dynamicParticipants.includes(APP_STATE.activeChatTargetUserHash)
        );

        if (operationalThreadRecordData && operationalThreadRecordData.messageLog) {
            // Append the clearing user ID to every current message in the log so they disappear for you
            operationalThreadRecordData.messageLog.forEach(msg => {
                if (!msg.deletedBy) {
                    msg.deletedBy = [];
                }
                if (!msg.deletedBy.includes(APP_STATE.currentUser.uid)) {
                    msg.deletedBy.push(APP_STATE.currentUser.uid);
                }
            });
            
            // Sync up, re-render, and flush down to standard engine storage views
            syncPlatformDatabaseStateToWebStorage();
            renderUserConversationsLogRoster();
            refreshMessengerActiveStreamBubblesDisplayList();
        }
    });
}

/**
 * Helper to compress user-uploaded images before base64 conversion.
 * Prevents LocalStorage QuotaExceeded errors (~5MB limit).
 */
function compressImageFile(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Universal Unified Infrastructure Floating Operations System Controller Launcher Method Engine
 */
function handleFloatingActionButtonTrigger() {
    if (!APP_STATE || !APP_STATE.currentUser) {
        if (typeof triggerAuthenticationModalSequence === 'function') {
            triggerAuthenticationModalSequence();
        } else {
            showTopRightToast("Please log in to continue.", "error");
        }
        return;
    }
    
    // Evaluate operational dynamic parameters rules routes contexts relative to view page positions
    if (APP_STATE.currentUser.accountType !== 'business' && APP_STATE.currentUser.uid !== 'admin') {
        if (typeof launchadvertismentofBusinessUpgrade === 'function') {
            launchadvertismentofBusinessUpgrade();
        } else {
            showTopRightToast("Upgrade to a business account to upload products.", "info");
        }
        return;
    }
    
    // Launch the security verification step first
    launchUploadProductPasswordVerificationStep();
}

/**
 * Step 1: Verify account ownership via password authentication
 */
function launchUploadProductPasswordVerificationStep() {
    const modalContentTargetNode = document.getElementById("auth-modal-content");
    if (!modalContentTargetNode) return;

    modalContentTargetNode.innerHTML = `
        <h3>Enter Current Password (Step 1 of 2)</h3>
    
        <div class="form-input-container margin-top-sm">
            <label>Active Password:</label>
            <input type="password" id="upload-verify-password" class="form-field-control" placeholder="Enter password to verify ownership context">
            
            <div id="err-upload-reauth-msg" class="text-danger-alert hidden-node">Incorrect Password</div>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-upload-showpass" onchange="toggleFormPasswordFieldVisibility(this, 'upload-verify-password')">
            <label for="chk-upload-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Password</label>            
        </div>

        <div class="text-center margin-top-xs">
            <span style="color:var(--fort-blue-light); cursor:pointer; font-size:0.9rem;" onclick="renderForgotPasswordModalWorkflow()">Forgot Password?</span>
        </div>
        <br>
        
        <div class="btn-group">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button> 
            <button onclick="verifyPasswordAndProceed()" class="btn-blue">Verify Password Phrase</button>
        </div>
    `;
    
    const authModal = document.getElementById("auth-modal");
    if (authModal) authModal.classList.add("active");
}

/**
 * Validates Step 1 password against active system state variables and advances to Step 2
 */
function verifyPasswordAndProceed() {
    const passwordInput = document.getElementById("upload-verify-password");
    const errNode = document.getElementById("err-upload-reauth-msg");
    
    if (!passwordInput) return;
    const enteredPassword = passwordInput.value.trim();
    
    if (errNode) errNode.classList.add("hidden-node");
    
    if (!APP_STATE || !APP_STATE.currentUser) {
        showTopRightToast("User session invalid.", "error");
        return;
    }

    // Dynamic password resolution for standard accounts and admins
    const activePassword = APP_STATE.currentUser.secretKey || APP_STATE.currentUser.password;

    if (!activePassword || enteredPassword !== activePassword) { 
        if (errNode) {
            errNode.innerText = "Incorrect Password"; 
            errNode.classList.remove("hidden-node"); 
        } else {
            showTopRightToast("Incorrect Password", "error");
        }
        return;
    }
    
    // Step 1 Success -> Proceed to Step 2 Form Inventory Template Layout
    launchUploadProductInventoryModalFormLayoutShell();
}

/**
 * Step 2: Input product details and specifications
 */
function launchUploadProductInventoryModalFormLayoutShell() {
    const modalContentTargetNode = document.getElementById("auth-modal-content");
    if (!modalContentTargetNode) return;

    const userCountry = (APP_STATE && APP_STATE.currentUser && APP_STATE.currentUser.country) ? APP_STATE.currentUser.country : 'Global';
    const currencySymbol = userCountry === 'Nigeria' ? '₦' : '$';

    modalContentTargetNode.innerHTML = `
        <h3>Product Upload - Step 2 of 2</h3>
        <p style="font-size:0.8rem; color:var(--fort-gray-slate); margin-top:2px;">Products created are localized and viewable exclusively within corresponding matching legal registration domain regions [Country Scope: <strong>${userCountry}</strong>]</p>
        
        <div class="form-input-container margin-top-sm">
            <label>Product Name</label>
            <input type="text" id="newprod-name" class="form-field-control" placeholder="Enter concise commercial inventory title text">
        </div>
 
        <div class="form-input-container">
            <label>Select Logistics Catalog Classification Category:</label>
            <select id="newprod-cat" class="form-field-control">
                <option value="Electrical Appliances">Electrical Appliances</option>
                <option value="Mobile Devices & Computers">Mobile Devices & Computers</option>
                <option value="Home Furniture">Home Furniture</option>
                <option value="Fashion Clothing Apparel">Fashion Clothing Apparel</option>
                <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                <option value="Sports, Fitness and Outdoors">Sports, Fitness and Outdoors</option>
                <option value="Groceries & Essentials">Groceries & Essentials</option>
                <option value="Others">Others</option>
            </select>
        </div>
        <div class="form-input-container">
            <label>Primary Short Public Marketing Overview Description (Max 100 Chars):</label>
            <input type="text" id="newprod-info" class="form-field-control" maxlength="100" placeholder="Max 100 text characters symbols structural limits constraints loops">
        </div>
        <div class="form-input-container-image">
            <label>Upload and Preview your Image</label>
            <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                <span id="placeholderTextimg">No image selected</span>
                <img id="imagePreview" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;">
            </div>
            <input type="file" id="imageInput" accept="image/*">
        </div>
        <br>
        <div class="form-input-container">
            <label>More Info and Specifications</label>
            <textarea id="newprod-aiinfo" class="form-field-control rounded-rect" style="height:60px;" placeholder="A more detailed explanation of product. (Optional but recommended)"></textarea>
        </div>
        <div class="form-input-container">
            <label>Unit Commercial Pricing Valuation Baseline Quote Amount Number (${currencySymbol}):</label>
            <input type="number" id="newprod-price" class="form-field-control" placeholder="Enter numeric base rate configuration">
        </div>
        
        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel Form</button>
            <button id="btn-publish-post" onclick="executePipelineCommitNewInventoryPostRecord()" class="btn-blue">Publish Active Post</button>
        </div>
    `;

    setupImagePreviewListener();
    const authModal = document.getElementById("auth-modal");
    if (authModal) authModal.classList.add("active");
}

/**
 * Handles live preview display
 */
function setupImagePreviewListener() {
    const imageInput = document.getElementById("imageInput");
    const imagePreview = document.getElementById("imagePreview");
    const placeholderText = document.getElementById("placeholderTextimg");

    if (!imageInput) return;

    imageInput.addEventListener("change", function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (imagePreview) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                }
                if (placeholderText) {
                    placeholderText.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        } else {
            if (imagePreview) {
                imagePreview.src = "";
                imagePreview.style.display = "none";
            }
            if (placeholderText) {
                placeholderText.style.display = "block";
            }
        }
    });
}

/**
 * Final Submission: Collects variables, processes files, updates databases, and updates dashboard metrics
 */
async function executePipelineCommitNewInventoryPostRecord() {
    const publishBtn = document.getElementById("btn-publish-post");
    const nameInput = document.getElementById("newprod-name");
    const catInput = document.getElementById("newprod-cat");
    const infoInput = document.getElementById("newprod-info");
    const imageInput = document.getElementById("imageInput");
    const aiInfoInput = document.getElementById("newprod-aiinfo");
    const priceInput = document.getElementById("newprod-price");

    const name = nameInput ? nameInput.value.trim() : "";
    const cat = catInput ? catInput.value : "Others";
    const info = infoInput ? infoInput.value.trim() : "";
    const aiInfo = aiInfoInput ? aiInfoInput.value.trim() : "";
    const priceRaw = priceInput ? priceInput.value : "";

    // Validate core compulsory fields
    if (!name || !info || !priceRaw || !imageInput || !imageInput.files || !imageInput.files[0]) {
        if (typeof showTopRightToast === 'function') {
            showTopRightToast("All compulsory info must be imputed and select an image before publishing.", "error");
        } else {
            alert("All compulsory info must be imputed and select an image before publishing.");
        }
        return;
    }

    try {
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerText = "Publishing...";
        }

        // Compress and extract Base64 data URL reliably
        const productImgDataUrl = await compressImageFile(imageInput.files[0]);

        // Isolate owner profile data points safely
        const ownerUid = APP_STATE.currentUser ? APP_STATE.currentUser.uid : ("user_" + Date.now());
        const ownerName = APP_STATE.currentUser ? (APP_STATE.currentUser.identityName || APP_STATE.currentUser.username || "User Account") : "User Account";
        const ownerBusinessName = APP_STATE.currentUser ? (APP_STATE.currentUser.businessName || ownerName) : ownerName;

        const finalProductInstanceObjectNode = {
            pid: "p_" + Date.now(),
            ownerUid: ownerUid,
            ownerName: ownerName,
            ownerBusinessName: ownerBusinessName,
            name: name,
            category: cat,
            info: info,
            price: parseFloat(priceRaw),
            coverPhoto: productImgDataUrl,
            aiInfo: aiInfo || "Standard platform baseline listed trading stock profile object reference specifications tracking structure model elements values data parameters.",
            clickCount: 0,
            createdAt: new Date().toISOString()
        };

        // Save to local state memory
        if (typeof SYSTEM_DATABASE === 'undefined') window.SYSTEM_DATABASE = {};
        if (!SYSTEM_DATABASE.products) SYSTEM_DATABASE.products = [];
        SYSTEM_DATABASE.products.push(finalProductInstanceObjectNode);

        // Update dashboard product counter (+1)
        if (typeof updateAdminDashboardMetricCount === 'function') {
            updateAdminDashboardMetricCount("lbl-metric-total-products-count", 1, "Products");
        }
        if (typeof renderAdminDashboardMetricsCounters === 'function') {
            renderAdminDashboardMetricsCounters();
        }

        // Safe web storage persistence (isolated so quota errors won't throw user-facing exceptions)
        try {
            if (typeof syncPlatformDatabaseStateToWebStorage === 'function') {
                syncPlatformDatabaseStateToWebStorage();
            }
        } catch (storageErr) {
            console.warn("Storage quota reached. Product saved in memory for active session:", storageErr);
        }
        
        if (typeof closeActiveModalDirectly === 'function') {
            closeActiveModalDirectly('auth-modal');
        }
        
        if (typeof showTopRightToast === 'function') {
            showTopRightToast("Product posted successfully!", "success");
        }
        
        if (typeof renderMarketplaceProductsDisplayLoop === 'function') {
            renderMarketplaceProductsDisplayLoop();
        }

    } catch (err) {
        console.error("Product publishing pipeline error:", err);
        if (typeof showTopRightToast === 'function') {
            showTopRightToast("An error occurred while uploading your product. Please try again.", "error");
        }
    } finally {
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.innerText = "Publish Active Post";
        }
    }
}

/**
 * Intelligent Cognitive AI Framework Search Integration Engine Assistant Workspace Panel Module
 */
let COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY = [
    { source: "ai", text: "Greetings! I am the integrated Fort AI Systems Cognitive Assistant. I possess complete operational system diagnostic metrics blueprints maps details to aid your experience. Ask me anything regarding site rules, features layout systems controls parameters, or dynamic product functionalities analysis schemas profiles.", graphics: null }
];

function initializeFortAiChatWindowWorkspace() {
    refreshAiAssistantBubbleLayoutStreamScroller();
}

function routeProductContextInquiryDirectlyToAiAssistant(productIdKeyValString) {
    const matchObj = SYSTEM_DATABASE.products.find(p => p.pid === productIdKeyValString);
    if(matchObj) {
         APP_STATE.fortAiActiveTaggedProductObject = matchObj;
         COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY.push({
              source: "user",
              text: `[System Context Bound Reference Trigger Mapping Attach Element Event]: Actively inspecting target inventory trace: "${matchObj.name}". Please outline functional specs overview mappings indices.`,
              graphics: null
         });
         
         navigateToPage('fort-ai');
         
         // Trigger automated delayed downstream intelligence mapping lookup responses structures vectors sets algorithms
         setTimeout(() => {
             COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY.push({
                 source: "ai",
                 text: `Analyzing core technical tracking schemas variables metrics data blocks references for inventory profile item listing matching key: "${matchObj.name}". Found metadata profiles: ${matchObj.info} Additional AI Parameters Framework Blueprint Specs Mapping Log reads: ${matchObj.aiInfo}`,
                 graphics: null
             });
             refreshAiAssistantBubbleLayoutStreamScroller();
         }, 1000);
    }
}

function refreshAiAssistantBubbleLayoutStreamScroller() {
    const containerTargetNode = document.getElementById("ai-chat-bubble-scroller");
    if(!containerTargetNode) return;
    
    containerTargetNode.innerHTML = "";
    
    const tagLabelNode = document.getElementById("ai-active-product-tag");
    if(APP_STATE.fortAiActiveTaggedProductObject) {
        tagLabelNode.innerText = `🏷️ Context Anchor Active: ${APP_STATE.fortAiActiveTaggedProductObject.name}`;
        tagLabelNode.classList.remove("hidden-node");
    } else {
        tagLabelNode.classList.add("hidden-node");
    }
    
    COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY.forEach(row => {
        const bubbleNodeElement = document.createElement("div");
        const aiFlagCondition = row.source === 'ai';
        bubbleNodeElement.className = `chat-bubble-node rounded-rect ${aiFlagCondition ? 'incoming-msg' : 'outgoing-msg'}`;
        if(aiFlagCondition) {
             bubbleNodeElement.style.backgroundColor = "#e0f2f1"; // unique assistant panel visual tracking color
        }
        
        bubbleNodeElement.innerHTML = `
            <p style="font-weight:${aiFlagCondition ? '500' : '400'};">${row.text}</p>
            <div class="msg-meta-row"><span>Fort AI Core</span></div>
        `;
        containerTargetNode.appendChild(bubbleNodeElement);
    });
    
    containerTargetNode.scrollTop = containerTargetNode.scrollHeight;
}

function submitAiQueryRequest() {
    const inputNode = document.getElementById("ai-text-input-field");
    const QueryString = inputNode.value.trim();
    if(QueryString === "") return;
    
    COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY.push({ source: "user", text: QueryString, graphics: null });
    inputNode.value = "";
    refreshAiAssistantBubbleLayoutStreamScroller();
    
    // Cognitive execution sequence parsing rules matches patterns behaviors
    setTimeout(() => {
        let responseLineText = "I have queried the global external web references databases indices to parse your evaluation request parameters loops tracking metrics constraints, but found no direct infrastructure adjustments. Please clarify details.";
        const normalizedInput = QueryString.toLowerCase();
        
        if(normalizedInput.includes("admin") || normalizedInput.includes("password") || normalizedInput.includes("login")) {
            responseLineText = "System Operational Guide Rule Mapping Log: Global system platform management accounts operate via dial prefix selector set 'Nigeria +234' with access credentials handle matching text string 'Fort Mart'. Core parameters entries cannot be reset without validation.";
        } else if(normalizedInput.includes("shipping") || normalizedInput.includes("currency") || normalizedInput.includes("country")) {
            responseLineText = "System Architecture Framework Parameters Metric Check: Core product matching streams currency symbols outputs (₦ or $) adjust dynamically checking localized regional geo settings identifiers attributes logged when registering.";
        } else if(normalizedInput.includes("hello") || normalizedInput.includes("hi ")) {
            responseLineText = "Hello! I am standing by to process system tools troubleshooting questions, core features mapping descriptions parameters traces, or catalog asset lookup evaluations requests.";
        }
        
        COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY.push({ source: "ai", text: responseLineText, graphics: null });
        refreshAiAssistantBubbleLayoutStreamScroller();
    }, 1200);
}

function clearAiChatHistory() {
    displayConfirmationModalOverlayAction("Are you sure you want to clear your current AI conversation session window timeline logs traces baseline elements matrices indexes?", () => {
        COGNITIVE_AI_SESSION_MOCK_STREAM_LOGS_ARRAY = [
            { source: "ai", text: "Session timeline memory traces purged successfully. Framework canvas running clean. State system standing by to parse inquiries models.", graphics: null }
        ];
        APP_STATE.fortAiActiveTaggedProductObject = null;
        refreshAiAssistantBubbleLayoutStreamScroller();
    });
}

/**
 * Profile Settings, Dynamic User Info Data Mutation & Feedback Subsystem Controllers Modules
 */
function switchSettingsSection(selectedSectionTabIdKey) {
    document.querySelectorAll(".settings-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".settings-sub-panel").forEach(panel => panel.classList.add("hidden-node"));
    
    // Activate target parameters arrays tracking nodes loops elements
    event.currentTarget.classList.add("active");
    document.getElementById(`settings-node-${selectedSectionTabIdKey}`).classList.remove("hidden-node");
    if (selectedSectionTabIdKey === 'my-products') {
        // Safe execution guard wrapper
        if (typeof renderAccountInventoryLedgerManagementDashboardGrid === 'function') {
            renderAccountInventoryLedgerManagementDashboardGrid();
        }
    }
}

/**
 * Refreshed Account Management Fields Loader (Fetches live from Supabase)
 */
async function initializeProfileDetailsAccountManagementFieldsValues() {
    if (!APP_STATE.currentUser || !APP_STATE.currentUser.uid) return;
    
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        return;
    }

    // 1. Fetch fresh user profile data from Supabase using the active user's uid and the local 'db' client
    const { data: remoteUser, error } = await db
        .from('users')
        .select('*')
        .eq('uid', APP_STATE.currentUser.uid)
        .single();

    if (error) {
        console.error("Error fetching user profile from Supabase:", error.message);
    } else if (remoteUser) {
        // Map snake_case database columns back to your runtime APP_STATE properties
        APP_STATE.currentUser = {
            ...remoteUser,
            identityName: remoteUser.identity_name,
            accountType: remoteUser.account_type,
            dialingCode: remoteUser.dialing_code,
            identifierText: remoteUser.identifier_text,
            secretKey: remoteUser.secret_key,
            businessName: remoteUser.business_name,
            businessInfo: remoteUser.business_info
        };
    }

    const currentUser = APP_STATE.currentUser;
    const globalDefaultVectorAvatarURI = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230288d1'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    const operationalActiveAvatarImageSrc = currentUser.avatar || globalDefaultVectorAvatarURI;

    // 2. Update avatars across the UI elements
    const profilePaneAvatarNodeFrame = document.getElementById("profile-pane-avatar-display");
    if (profilePaneAvatarNodeFrame) profilePaneAvatarNodeFrame.src = operationalActiveAvatarImageSrc;

    const navUserAvatarNodeFrame = document.getElementById("nav-user-avatar");
    if (navUserAvatarNodeFrame) navUserAvatarNodeFrame.src = operationalActiveAvatarImageSrc;

    const drawerUserAvatarNodeFrame = document.getElementById("drawer-user-avatar");
    if (drawerUserAvatarNodeFrame) drawerUserAvatarNodeFrame.src = operationalActiveAvatarImageSrc;

    // 3. Render text fields onto the Account Info settings page
    const usernameElement = document.getElementById("txt-profile-username-val");
    if (usernameElement) usernameElement.innerText = currentUser.identityName || "";

    const bizFieldsNodeWrapper = document.getElementById("business-profile-only-fields"); 
    if (bizFieldsNodeWrapper) {
        if (currentUser.accountType === 'business' || currentUser.uid === 'admin') { 
            bizFieldsNodeWrapper.classList.remove("hidden-node");
            
            const busNameElement = document.getElementById("txt-profile-busname-val");
            if (busNameElement) busNameElement.innerText = currentUser.businessName || "N/A"; 
            
            const busInfoElement = document.getElementById("txt-profile-businfo-val");
            if (busInfoElement) busInfoElement.innerText = currentUser.businessInfo || "N/A";
        } else {
            bizFieldsNodeWrapper.classList.add("hidden-node");
        }
    }
}

/**
 * Profile Edit Multi-step Wizard Management System
 * Enforces current password validation followed by a secure email OTP check before saving mutations.
 */

function openProfileEditWizard(targetFieldNameStringTokenKey) {
    const modalTargetNode = document.getElementById("auth-modal-content");
    if (!modalTargetNode) return;

    modalTargetNode.innerHTML = `
        <h3>Validate Account Ownership (Step 1 of 3)</h3>
        <div class="form-input-container margin-top-sm">
            <label>Input Current Password:</label>
            <input type="password" id="profile-reauth-key" class="form-field-control" placeholder="Enter password to verify ownership context">
            <div id="err-profile-reauth-msg" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;">Incorrect Password</div>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-signin-showpass" onchange="toggleFormPasswordFieldVisibility(this, 'profile-reauth-key')">
            <label for="chk-signin-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Password</label>
        </div>

        <div class="text-center margin-top-xs">
            <span style="color:var(--fort-blue-light); cursor:pointer; font-size:0.9rem;" onclick="renderForgotPasswordModalWorkflow()">Forgot Password?</span>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button>
            <button onclick="executeVerifyProfileReauthCredentialPasswordMatch('${targetFieldNameStringTokenKey}')" class="btn-blue">Verify Password</button>
        </div>
    `;
    
    // FIXED CRITICAL MISSING LINK: Added display initialization instructions
    document.getElementById("auth-modal").classList.add("active");
}

function executeVerifyProfileReauthCredentialPasswordMatch(targetFieldNameStringTokenKey) {
    const enteredPasswordValue = document.getElementById("profile-reauth-key").value;
    const errorDisplayNode = document.getElementById("err-profile-reauth-msg");
    
    errorDisplayNode.classList.add("hidden-node");
    if (enteredPasswordValue !== APP_STATE.currentUser.secretKey) {
        errorDisplayNode.innerText = "Incorrect Password";
        errorDisplayNode.classList.remove("hidden-node");
        return;
    }
    
    sendProfileEditWizardEmailJsOtpWorkflow(targetFieldNameStringTokenKey, true);
}

async function sendProfileEditWizardEmailJsOtpWorkflow(targetFieldNameStringTokenKey, isInitialLaunch = false) {
    const targetEmail = APP_STATE.currentUser.identifierText;
    const todayKeyStr = "profile_otp_limit_" + new Date().toISOString().split('T')[0] + "_" + targetEmail.toLowerCase();
    
    let dailyAttemptsCount = parseInt(localStorage.getItem(todayKeyStr) || "0", 10);
    if (dailyAttemptsCount >= 5) {
        if (!isInitialLaunch) {
            const feedbackElement = document.getElementById("err-profile-step2-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 OTPs per day.";
                feedbackElement.style.color = "red";
                feedbackElement.classList.remove("hidden-node");
            }
        } else {
            renderProfileEditWizardStepTwoLayout(targetFieldNameStringTokenKey);
            setTimeout(() => {
                const feedbackElement = document.getElementById("err-profile-step2-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "Maximum daily limit reached. You can only send up to 5 OTPs per day.";
                    feedbackElement.style.color = "red";
                    feedbackElement.classList.remove("hidden-node");
                }
            }, 50);
        }
        return;
    }

    initiateProfileEditOtpResendCooldown(targetFieldNameStringTokenKey);
    const freshGeneratedOtpCode = Math.floor(1000 + Math.random() * 9000);
    SIGNUP_WIZARD_TEMPORARY_OBJECT.profileActiveVerificationOtp = freshGeneratedOtpCode;

    dailyAttemptsCount++;
    localStorage.setItem(todayKeyStr, dailyAttemptsCount.toString());
    if (!isInitialLaunch) {
        const feedbackElement = document.getElementById("err-profile-step2-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Sending fresh token...";
            feedbackElement.style.color = "blue";
            feedbackElement.classList.remove("hidden-node");
        }
    }

    try {
        if (window.emailjs) {
            await window.emailjs.send(
                "service_ejag5pe", 
                "template_nzub7tk", 
                {
                    to_email: targetEmail,
                    user_name: APP_STATE.currentUser.identityName,
                    otp_code: freshGeneratedOtpCode
                }
            );
            if (isInitialLaunch) {
                renderProfileEditWizardStepTwoLayout(targetFieldNameStringTokenKey);
            } else {
                const feedbackElement = document.getElementById("err-profile-step2-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "A new verification code has been successfully sent.";
                    feedbackElement.style.color = "green";
                    feedbackElement.classList.remove("hidden-node");
                }
            }
        } else {
            console.warn("EmailJS context missing.");
            if (isInitialLaunch) renderProfileEditWizardStepTwoLayout(targetFieldNameStringTokenKey);
        }
    } catch (sendErr) {
        console.error("EmailJS profile update error:", sendErr);
        if (isInitialLaunch) {
            renderProfileEditWizardStepTwoLayout(targetFieldNameStringTokenKey);
        } else {
            const feedbackElement = document.getElementById("err-profile-step2-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Failed to send code. Please check your network connection.";
                feedbackElement.style.color = "red";
                feedbackElement.classList.remove("hidden-node");
            }
        }
    }
}

function initiateProfileEditOtpResendCooldown(targetFieldNameStringTokenKey) {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval);
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft = 30;

    SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval = setInterval(() => {
        SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft--;
        const resendLinkNode = document.getElementById("profile-otp-resend-link");
        
        if (resendLinkNode) {
            if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft > 0) {
                resendLinkNode.innerText = `Resend in ${SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft}s`;
                resendLinkNode.style.opacity = "0.5";
                resendLinkNode.style.fontWeight = "400";
                resendLinkNode.style.pointerEvents = "none";
            } else {
                resendLinkNode.innerText = "Resend";
                resendLinkNode.style.opacity = "1";
                resendLinkNode.style.fontWeight = "600";
                resendLinkNode.style.pointerEvents = "auto";
                clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval);
                SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval = null;
            }
        } else if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft <= 0) {
            clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval);
            SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval = null;
        }
    }, 1000);
}

function handleProfileEditOtpResendClickInterception(targetFieldNameStringTokenKey) {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft > 0) return;
    sendProfileEditWizardEmailJsOtpWorkflow(targetFieldNameStringTokenKey, false);
}

function renderProfileEditWizardStepTwoLayout(targetFieldNameStringTokenKey) {
    const modalTargetNode = document.getElementById("auth-modal-content");
    const targetEmail = APP_STATE.currentUser.identifierText;
    const secondsLeft = SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft || 0;
    const textLabel = secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend";
    const opacityStyle = secondsLeft > 0 ? "0.5" : "1";
    const weightStyle = secondsLeft > 0 ? "400" : "600";
    const pointerStyle = secondsLeft > 0 ? "none" : "auto";

    modalTargetNode.innerHTML = `
        <h3>Verify Security Profile Identity (Step 2 of 3)</h3>
        <p style="font-size:0.9rem; margin-top:6px; color:var(--fort-gray-slate);">
            An identity verification message code was sent to your registered profile email address: ${targetEmail}
        </p>

        <div class="form-input-container margin-top-sm">
            <label>Input 4-Digit Security OTP Token Key:</label>
            <input type="text" id="profile-otp-input" class="form-field-control" placeholder="X X X X" maxlength="4" style="text-align:center; font-size:1.25rem; letter-spacing:8px;">
            <div id="err-profile-step2-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>

        <div style="margin-top: 10px; font-size: 0.85rem;">
            <span>Didn't receive message? </span>
            <a href="javascript:void(0)" id="profile-otp-resend-link" onclick="handleProfileEditOtpResendClickInterception('${targetFieldNameStringTokenKey}')" style="color: #007bff; text-decoration:none; font-weight:${weightStyle}; opacity:${opacityStyle}; pointer-events:${pointerStyle};">${textLabel}</a>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="handleClearProfileTimersAndReturnToStepOne('${targetFieldNameStringTokenKey}')" class="btn-gray">Back</button>
            <button onclick="executeValidateProfileWizardOtpTokenKey('${targetFieldNameStringTokenKey}')" class="btn-blue">Verify Security Code</button>
        </div>
    `;
}

function handleClearProfileTimersAndReturnToStepOne(targetFieldNameStringTokenKey) {
    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval);
        SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval = null;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft = 0;
    openProfileEditWizard(targetFieldNameStringTokenKey);
}

function executeValidateProfileWizardOtpTokenKey(targetFieldNameStringTokenKey) {
    const inputVal = document.getElementById("profile-otp-input").value.trim();
    const feedback = document.getElementById("err-profile-step2-feedback");
    
    feedback.classList.add("hidden-node");
    feedback.style.color = "red";

    const systemExpected = String(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileActiveVerificationOtp || "");
    if (!inputVal || inputVal !== systemExpected) {
        feedback.innerText = "Invalid verification token code expression entry parameter configuration.";
        feedback.classList.remove("hidden-node");
        return;
    }

    if (SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval) {
        clearInterval(SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval);
        SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpInterval = null;
    }
    SIGNUP_WIZARD_TEMPORARY_OBJECT.profileOtpSecondsLeft = 0;

    renderProfileEditWizardStepThreeFinalModificationInputLayout(targetFieldNameStringTokenKey);
}

function renderProfileEditWizardStepThreeFinalModificationInputLayout(targetFieldNameStringTokenKey) {
    const modalTargetNode = document.getElementById("auth-modal-content");
    let inputFieldTypeLayoutPlaceholderHTML = ``;

    if (targetFieldNameStringTokenKey === 'secretKey') {
        inputFieldTypeLayoutPlaceholderHTML = `
            <div class="form-input-container margin-top-sm">
                <label>Input New Security Password Expression:</label>
                <input type="password" id="profile-new-value-1" class="form-field-control" placeholder="New structural value">
            </div>
            <div class="form-input-container">
                <label>Confirm Entry Configuration Parameters Match:</label>
                <input type="password" id="profile-new-value-2" class="form-field-control" placeholder="Retype expression code configurations">
            </div>
        `;
    } else if (targetFieldNameStringTokenKey === 'avatar') {
        inputFieldTypeLayoutPlaceholderHTML = `
            <div class="form-input-container margin-top-sm">
                <label>Upload New Profile Picture:</label>
                <div class="form-input-container-image">
                    <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                        <span id="placeholderTextimg-profile">No image selected</span>
                        <img id="imagePreview-profile" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: none;">
                    </div>
                </div>
                <input type="file" id="profile-avatar-file" class="form-field-control" accept=".png, .jpg, .jpeg" onchange="processProfileEditAvatarFileSelection()">
                <input type="hidden" id="profile-new-value-1" value="">
            </div>
        `;
    } else {
        const structuralDisplayLabelText = targetFieldNameStringTokenKey === 'identityName' ?
            'Personal Full Name Context' : 
            (targetFieldNameStringTokenKey === 'businessName' ? 'Business Trading Enterprise Title' : 'Business Strategy Description Information Portfolio Summary Statement');
        inputFieldTypeLayoutPlaceholderHTML = `
            <div class="form-input-container margin-top-sm">
                <label>Modify ${structuralDisplayLabelText}:</label>
                <input type="text" id="profile-new-value-1" class="form-field-control" value="${APP_STATE.currentUser[targetFieldNameStringTokenKey] || ''}" placeholder="Enter updated field text value mappings">
            </div>
        `;
    }

    modalTargetNode.innerHTML = `
        <h3>Commit Field Mutations (Step 3 of 3)</h3>
        <div id="profile-mutation-fields-context-node-target">
            ${inputFieldTypeLayoutPlaceholderHTML}
            <div id="err-profile-step3-feedback" class="text-danger-alert hidden-node" style="color: red; font-size: 0.8rem; margin-top: 4px;"></div>
        </div>

        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button>
            <button onclick="executeSaveProfileWizardModificationsToDatabase('${targetFieldNameStringTokenKey}')" class="btn-blue">Save Changes</button>
        </div>
    `;
}

/**
 * ------------------------------------------------------------------
 * 5. PROFILE EDIT WIZARD WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeSaveProfileWizardModificationsToDatabase(targetFieldNameStringTokenKey) {
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        return;
    }

    const val1 = document.getElementById("profile-new-value-1").value.trim();
    const errorNode = document.getElementById("err-profile-step3-feedback");
    errorNode.classList.add("hidden-node");
    
    if (!val1) {
        errorNode.innerText = "Field value cannot be blank.";
        errorNode.classList.remove("hidden-node");
        return;
    }

    // Handle avatar updates specifically via storage and database sync
    if (targetFieldNameStringTokenKey === 'avatar') {
        await updateProfileAvatar(val1);
        closeActiveModalDirectly('auth-modal');
        return;
    }

    if (targetFieldNameStringTokenKey === 'secretKey') {
        const val2 = document.getElementById("profile-new-value-2").value.trim();
        if (val1 !== val2) {
            errorNode.innerText = "Password mismatch discovered.";
            errorNode.classList.remove("hidden-node");
            return;
        }
        if (val1.length < 6 || !/[A-Z]/.test(val1) || !/[a-z]/.test(val1) || !/[0-9]/.test(val1) || !/[^A-Za-z0-9]/.test(val1)) {
            errorNode.innerText = "Password must have at least one uppercase letter, one lowercase letter, one symbol, one number and be at least six characters.";
            errorNode.classList.remove("hidden-node");
            return;
        }
    }

    // Map JavaScript property names to database column names
    const fieldMapping = {
        username: 'identity_name', // Fallback mapping support
        identityName: 'identity_name',
        businessName: 'business_name',
        businessInfo: 'business_info',
        dialingCode: 'dialing_code',
        secretKey: 'secret_key',
        avatar: 'avatar'
    };

    const dbColumn = fieldMapping[targetFieldNameStringTokenKey] || targetFieldNameStringTokenKey;
    const updatePayload = {};
    updatePayload[dbColumn] = val1;

    // Overwrite and update fields in the Supabase 'users' table for active user uid using the local 'db' client
    const { data: updatedRecord, error: updateError } = await db
        .from('users')
        .update(updatePayload)
        .eq('uid', APP_STATE.currentUser.uid)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating profile in Supabase:", updateError.message);
        errorNode.innerText = "Update failed: " + updateError.message;
        errorNode.classList.remove("hidden-node");
        return;
    }

    const updatedClientUser = {
        ...updatedRecord,
        identityName: updatedRecord.identity_name,
        accountType: updatedRecord.account_type,
        dialingCode: updatedRecord.dialing_code,
        identifierText: updatedRecord.identifier_text,
        secretKey: updatedRecord.secret_key,
        businessName: updatedRecord.business_name,
        businessInfo: updatedRecord.business_info
    };

    APP_STATE.currentUser = updatedClientUser;

    closeActiveModalDirectly('auth-modal');
    if (typeof initializeProfileDetailsAccountManagementFieldsValues === "function") {
        initializeProfileDetailsAccountManagementFieldsValues();
    }

    showTopRightToast("Profile updated successfully", "success");
}

function processProfileEditAvatarFileSelection() {
    const fileNode = document.getElementById("profile-avatar-file");
    const placeholder = document.getElementById("placeholderTextimg-profile");
    const preview = document.getElementById("imagePreview-profile");
    const hiddenVal = document.getElementById("profile-new-value-1");

    if (fileNode && fileNode.files && fileNode.files[0]) {
        const readerInstance = new FileReader();
        readerInstance.onload = function(e) {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block";
            }
            if (placeholder) {
                placeholder.style.display = "none";
            }
            if (hiddenVal) {
                hiddenVal.value = e.target.result;
            }
        };
        readerInstance.readAsDataURL(fileNode.files[0]);
    } else {
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }
        if (placeholder) {
            placeholder.style.display = "block";
        }
        if (hiddenVal) {
            hiddenVal.value = "";
        }
    }
}

/**
 * Handle new avatar image updates from profile edit wizard/settings
 */
/**
 * Handle new avatar image updates from profile edit wizard/settings,
 * uploading directly to the Supabase Storage bucket.
 */
/**
 * Helper function to upload base64, data URLs, or File objects to Supabase Storage bucket 'user-avatars'
 * Fully safe for both file:/// and https:// protocols.
 */
async function uploadAvatarToSupabaseStorage(fileOrBase64, filenamePrefix = 'avatar') {
    if (!fileOrBase64) return "";
    
    const client = getSupabaseClient();
    if (!client) {
        console.error("Supabase client could not be initialized.");
        showTopRightToast("Supabase client is not ready.", "error");
        return "";
    }

    let fileBody = fileOrBase64;

    // Convert string inputs (Base64 / Data URLs) to Blob natively (works on file:/// and https://)
    if (typeof fileOrBase64 === 'string') {
        try {
            let base64Data = fileOrBase64;
            let contentType = 'image/png';

            if (fileOrBase64.startsWith('data:')) {
                const parts = fileOrBase64.split(';');
                contentType = parts[0].replace('data:', '');
                const base64Part = parts.find(p => p.startsWith('base64,'));
                if (base64Part) {
                    base64Data = base64Part.replace('base64,', '');
                }
            }

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            fileBody = new Blob([byteArray], { type: contentType });
        } catch (err) {
            console.error("Failed to parse base64 string:", err);
            showTopRightToast("Failed to parse image file payload.", "error");
            return "";
        }
    }
    
    const filePath = `avatars/${filenamePrefix}_${Date.now()}.png`;

    try {
        // Wrap the Supabase network call in a timeout promise (10 seconds max) 
        const uploadPromise = client.storage
            .from('user-avatars')
            .upload(filePath, fileBody, {
                contentType: 'image/png',
                upsert: true
            });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase storage upload timed out.")), 10000)
        );

        const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

        if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError.message);
            // Display exact error as a toast without closing the modal
            showTopRightToast("Upload Failed: " + uploadError.message, "error");
            return "";
        }

        const { data: publicUrlData } = client.storage
            .from('user-avatars')
            .getPublicUrl(filePath);

        return publicUrlData ? publicUrlData.publicUrl : "";

    } catch (err) {
        console.error("Upload process failed or timed out:", err.message);
        showTopRightToast("Upload error: " + err.message, "error");
        return "";
    }
}

/**
 * Handle new avatar image updates from profile edit wizard/settings,
 * uploading directly to the Supabase Storage bucket without closing modals on failure.
 */
async function updateProfileAvatar(fileOrBase64) {
    if (!APP_STATE.currentUser) return;
    
    const db = getSupabaseClient();
    if (!db) {
        console.error("Supabase client is not ready yet.");
        showTopRightToast("Supabase client is not ready.", "error");
        return;
    }

    // 1. Upload image to public Supabase Storage bucket 'user-avatars'
    const publicAvatarUrl = await uploadAvatarToSupabaseStorage(fileOrBase64, APP_STATE.currentUser.uid);
    if (!publicAvatarUrl) {
        // Error toast is already triggered inside uploadAvatarToSupabaseStorage, modal remains open
        return;
    }

    // 2. Update avatar column in Supabase database table 'users'
    const { data: updatedRecord, error: updateError } = await db
        .from('users')
        .update({ avatar: publicAvatarUrl })
        .eq('uid', APP_STATE.currentUser.uid)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating avatar in Supabase database:", updateError.message);
        showTopRightToast("Database Update Failed: " + updateError.message, "error");
        return;
    }

    if (updatedRecord) {
        APP_STATE.currentUser.avatar = updatedRecord.avatar;
        initializeProfileDetailsAccountManagementFieldsValues();
        showTopRightToast("Avatar successfully uploaded and updated!", "success");
        
        // Close modal only on complete success
        closeActiveModalDirectly('auth-modal');
    }
}

// Cleaned pricing matrix matching exactly 20 slots from your specifications
const LEADERBOARD_SLOT_PRICES = [
    6000, 5500, 5000, 4750, 4500, 4250, 4000, 3750, 3500, 3250,
    3000, 2750, 2500, 2250, 2000, 1700, 1500, 1200, 1000, 500
];

const LEADERBOARD_PAYSTACK_PLAN_CODES = [
    "PLN_0j80to7xqksqqxx", // Plan 1
    "PLN_f75y0jhvim7a56r", // Plan 2
    "PLN_liyqjmp1qncjarn", // Plan 3
    "PLN_simekhu9m69dztb", // Plan 4
    "PLN_3c0od5kkzjo2h3s", // Plan 5
    "PLN_lj2enl3b4pgyfor", // Plan 6
    "PLN_ejw2l81gxvntprk", // Plan 7
    "PLN_1e0rb2t8gpf170y", // Plan 8
    "PLN_1pfakn5dsqsrr3h", // Plan 9
    "PLN_eclvsaz7o38ug3f", // Plan 10
    "PLN_i2xrie9zc0y1hn0", // Plan 11
    "PLN_fb9x888p2v5fo0v", // Plan 12
    "PLN_5eydk6g9n4bnfkv", // Plan 13
    "PLN_qw2g5sbfoc7vt7d", // Plan 14
    "PLN_s99g9sr1jk4eeez", // Plan 15
    "PLN_0k1n2aipe4a9bpt", // Plan 16
    "PLN_uajjx1lfqs4hrqj", // Plan 17
    "PLN_f9wcm0p5y9jzgvq", // Plan 18
    "PLN_chd5qbiut7lthpl", // Plan 19
    "PLN_fs8ribiee7klbl0"  // Plan 20
];

function formatToNaira(amount) {
    return "₦" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderAccountInventoryLedgerManagementDashboardGrid() {
    const listContainerNodeElement = document.getElementById("my-products-list-container");
    if(!listContainerNodeElement) return;
    
    listContainerNodeElement.innerHTML = "";
    if(!APP_STATE.currentUser) return;

    if (APP_STATE.currentUser.accountType !== 'business' && APP_STATE.currentUser.uid !== 'admin') {
        listContainerNodeElement.innerHTML = `
            <div class="upgrade-notice-box">
                Upgrade to business account to post, view products and also have access to pinned products.
            </div>

            <!-- Account Upgrade Action Button -->
            <div class="text-center margin-top-xs">
                <button id="btn-upgrade-to-business" class="btn-blue" onclick="initiateBusinessAccountUpgradeSequence()">
                    Upgrade Account to Business (₦2,500)
                </button>
            </div>
        `;
        return;
    }
    
    const userOwnedInventoryItemsArray = SYSTEM_DATABASE.products.filter(p => p.ownerUid === APP_STATE.currentUser.uid);
    if(userOwnedInventoryItemsArray.length === 0) {
        listContainerNodeElement.innerHTML = `<div style="padding:16px; color:var(--fort-gray-slate); font-size:0.85rem;"><p>You have no posted products.</p></div>`;
    } else {
        userOwnedInventoryItemsArray.forEach(item => {
            const itemRowRowStripContainerElementNode = document.createElement("div");
            itemRowRowStripContainerElementNode.className = "rounded-rect";
            itemRowRowStripContainerElementNode.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid var(--fort-gray-border); margin-bottom:10px; background-color:var(--fort-white-snow);";
            
            itemRowRowStripContainerElementNode.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <img src="${item.coverPhoto}" style="width:40px; height:40px; object-fit:cover;" class="rounded-rect" alt="Thumb">
                    <div>
                        <h5 style="font-weight:700; color:var(--fort-blue-dark);">${item.name}</h5>
                        <span style="font-size:0.75rem; color:var(--fort-gray-slate);">Category: ${item.category} | Analytics Metrics Hits Counter Value: ${item.clickCount || 0} hits</span>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-blue" style="padding:4px 10px; font-size:0.75rem;" onclick="launchEditProductInventoryModalFormLayoutShell('${item.pid}')">Edit Details</button>
                    <button class="btn-danger" style="padding:4px 10px; font-size:0.75rem;" onclick="executeDeletePlatformInventoryItemListingPostRecord('${item.pid}')">Delete</button>
                </div>
            `;
            listContainerNodeElement.appendChild(itemRowRowStripContainerElementNode);
        });
    }

    renderLeaderboardInterfaceSectionInSettings(listContainerNodeElement.parentNode);
}

// Global variable structure setups
if (!SYSTEM_DATABASE.pinnedLeaderboard) {
    SYSTEM_DATABASE.pinnedLeaderboard = Array(20).fill(null);
}
if (!SYSTEM_DATABASE.slotMetadata) {
    SYSTEM_DATABASE.slotMetadata = Array(20).fill(null).map(() => ({
        expirationTime: null,
        autoRenew: true,
        previousOwnerUid: null
    }));
}

function renderLeaderboardInterfaceSectionInSettings(parentElementContainer) {
    let existingSubSection = document.getElementById("settings-leaderboard-sub-container");
    if (existingSubSection) existingSubSection.remove();

    const subSectionNode = document.createElement("div");
    subSectionNode.id = "settings-leaderboard-sub-container";
    subSectionNode.className = "leaderboard-settings-section";
    
    subSectionNode.innerHTML = `
        <h3 style="margin-bottom: 4px; color: var(--fort-blue-dark);">🏆 Global Leaderboard Subscription Slots</h3>
        <p style="font-size: 0.8rem; color: var(--fort-gray-slate); margin-bottom: 12px;">Review positioning slots, check real-time availability states or manage active subscriptions.</p>
        <div id="settings-slots-stack-target" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    parentElementContainer.appendChild(subSectionNode);

    const targetStackGrid = document.getElementById("settings-slots-stack-target");
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard;
    const metadata = SYSTEM_DATABASE.slotMetadata;
    const currentUserId = APP_STATE.currentUser.uid;
    const isAdmin = (currentUserId === 'admin');
    const now = Date.now();

    for (let idx = 0; idx < 20; idx++) {
        const productPid = leaderboard[idx];
        const linkedProduct = productPid ? SYSTEM_DATABASE.products.find(p => p.pid === productPid) : null;
        const slotMeta = metadata[idx];
        const slotPrice = LEADERBOARD_SLOT_PRICES[idx];

        let inlineColorStyle = "background: #f4f6f9; border-left: 5px solid #ccc;"; 
        let slotStatusLabelText = `Available Vacant Slot — ${formatToNaira(slotPrice)}`;
        let operationalActionButtonHTML = `<button class="btn-blue" style="padding: 6px 12px; font-size:0.75rem;" onclick="initiateSlotSubscriptionPurchaseSequence(${idx})">Buy Slot</button>`;

        const isExpired = slotMeta.expirationTime && now > slotMeta.expirationTime;
        const gracePeriodEnd = slotMeta.expirationTime ? slotMeta.expirationTime + (24 * 60 * 60 * 1000) : null;
        const isInGracePeriod = isExpired && gracePeriodEnd && now <= gracePeriodEnd;

        // Check ownership context safely via metadata tracking or the pinned items mapping setup
        const isActuallyOwned = linkedProduct || (slotMeta.expirationTime && !isExpired);
        const ownerUid = linkedProduct ? linkedProduct.ownerUid : slotMeta.previousOwnerUid;
        const isUserOwner = (ownerUid === currentUserId);

        if (isActuallyOwned && !isExpired) {
            const ownerAccount = SYSTEM_DATABASE.users.find(u => u.uid === ownerUid);
            const ownerDisplayName = ownerAccount ? (ownerAccount.businessName || ownerAccount.identityName) : "Unknown Vendor";
            
            if (isUserOwner) {
                inlineColorStyle = "background: #e3f2fd; border-left: 5px solid var(--fort-blue-primary);";
                slotStatusLabelText = `Occupied by You (Expires: ${new Date(slotMeta.expirationTime).toLocaleDateString()})`;
                operationalActionButtonHTML = `
                    <div style="display:flex; gap:6px;">
                        <button class="btn-blue" style="padding: 6px 12px; font-size:0.75rem;" onclick="launchManageSlotModal(${idx})">Manage Slot</button>
                        <button class="btn-danger" style="padding: 6px 12px; font-size:0.75rem; background:crimson; color:white; border:none; border-radius:4px;" onclick="cancelActiveSlotSubscription(${idx})">Cancel</button>
                    </div>`;
            } else {
                // RULE: If a slot is owned by a user and another user views it, the slot should be grey and show no buttons, just unavailable[cite: 1]
                inlineColorStyle = "background: #e0e0e0; border-left: 5px solid #9e9e9e; opacity: 0.75; color: #616161;";
                slotStatusLabelText = `Occupied by: ${ownerDisplayName} — Unavailable`;
                operationalActionButtonHTML = isAdmin ? `<button class="btn-gray" style="padding: 6px 12px; font-size:0.75rem; color: red;" onclick="cancelActiveSlotSubscription(${idx})">Force Evict</button>` : '';
            }
        } else if (isInGracePeriod) {
            // RULE: Grace period of 24 hours logic if auto-renew is not on and user didn't renew[cite: 1]
            if (isUserOwner) {
                // Showing red on the user's list[cite: 1]
                inlineColorStyle = "background: #ffebee; border-left: 5px solid #ef5350; color: #c62828;";
                slotStatusLabelText = `Your subscription expired! 24h Grace Period Active — ${formatToNaira(slotPrice)}`;
                operationalActionButtonHTML = `<button class="btn-danger" style="background:#d32f2f; color:white; padding: 6px 12px; font-size:0.75rem;" onclick="initiateSlotSubscriptionPurchaseSequence(${idx})">Renew Now</button>`;
            } else {
                // Still unavailable color and indicator for others[cite: 1]
                inlineColorStyle = "background: #e0e0e0; border-left: 5px solid #9e9e9e; opacity: 0.6; color: #616161;";
                slotStatusLabelText = `Unavailable (In Grace Period Renewal window)`;
                operationalActionButtonHTML = '';
            }
        } else {
            if (isExpired && !isInGracePeriod && slotMeta.previousOwnerUid) {
                // Cleanup out of bounds records automatically
                leaderboard[idx] = null;
                const oldOwner = slotMeta.previousOwnerUid;
                slotMeta.previousOwnerUid = null;
                slotMeta.expirationTime = null;
                sendFortMartAdminSystemNotification(oldOwner, "Your 24-hour grace renewal period has expired. The slot is now publicly available.");
            }
        }

        const slotCardElement = document.createElement("div");
        slotCardElement.style.cssText = `${inlineColorStyle} display: flex; justify-content: space-between; align-items: center; padding: 12px; border-radius: 6px; margin-bottom: 4px; box-sizing: border-box;`;
        slotCardElement.innerHTML = `
            <div>
                <strong style="font-size: 0.9rem;">Slot Position #${idx + 1}</strong>
                <div style="font-size: 0.78rem; margin-top: 2px;">${slotStatusLabelText} ${linkedProduct && !isExpired ? `(${linkedProduct.name})` : ''}</div>
            </div>
            <div>${operationalActionButtonHTML}</div>
        `;
        targetStackGrid.appendChild(slotCardElement);
    }
}

function initiateSlotSubscriptionPurchaseSequence(slotIndexPositionId) {
    const userProducts = SYSTEM_DATABASE.products.filter(p => p.ownerUid === APP_STATE.currentUser.uid);
    if (userProducts.length === 0) {
        showTopRightToast("Action Required: You must list at least one standard product before buying a leaderboard ranking slot.", "info");
        return;
    }

    displayConfirmationModalOverlayAction("Verify account credentials before initializing the third-party Paystack processing node interface stream:", () => {
        // Enforce absolute timeline order sequence: close verification popup modal windows fully first
        const confirmModalNode = document.getElementById("confirm-modal");
        if (confirmModalNode) confirmModalNode.classList.remove("active");
        
        // RULE: Show the user's custom modal first before taking them to the default paystack modal[cite: 1]
        setTimeout(() => {
            launchPaystackPaymentCheckoutModalView(slotIndexPositionId);
        }, 150);
    });
}

function launchPaystackPaymentCheckoutModalView(slotIndex) {
    let existingModal = document.getElementById("paystack-checkout-modal");
    if (existingModal) existingModal.remove();

    const checkoutModalContainer = document.createElement("div");
    checkoutModalContainer.id = "paystack-checkout-modal";
    // Force direct styling configurations so that it displays perfectly inline on top of screens
    checkoutModalContainer.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;";

    const targetPrice = LEADERBOARD_SLOT_PRICES[slotIndex];
    const initialAutoRenewState = SYSTEM_DATABASE.slotMetadata[slotIndex].autoRenew;

    checkoutModalContainer.innerHTML = `
        <div class="paystack-modal-box" style="background: white; border-radius: 8px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid var(--fort-gray-border);">
            <div class="paystack-header-brand" style="background-color: #09a5db; color: white; padding: 20px; text-align: center;">
                <h3 style="margin:0; color:white;">Fort Mart Gateway</h3>
                <span style="font-size:0.75rem; opacity:0.9;">Securing payments for Fort Mart Pinned Products Slots</span>
            </div>
            <div class="paystack-body-content" style="padding: 24px;">
                <p style="font-size:0.85rem; color:var(--fort-blue-dark); margin-bottom:12px;">You are authorizing a payment subscription setup for <strong>Leaderboard Slot Position #${slotIndex + 1}</strong>.</p>
                <div class="form-input-container" style="margin-bottom:10px;">
                    <label style="display:block; font-size:0.8rem; margin-bottom:4px;">Email Address</label>
                    <input type="text" id="paystack-email-field" class="form-field-control" value="${APP_STATE.currentUser.identifierText || 'user@fortmart.com'}" disabled style="width:100%; padding:8px; box-sizing:border-box;">
                </div>
                <div class="form-input-container" style="margin-bottom:14px;">
                    <label style="display:block; font-size:0.8rem; margin-bottom:4px;">Price</label>
                    <input type="text" class="form-field-control" value="${formatToNaira(targetPrice)}" disabled style="width:100%; padding:8px; box-sizing:border-box;">
                </div>
            </div>
            <div class="paystack-footer-row" style="padding: 16px 24px; background: #f9f9f9; border-top: 1px solid #eee; display: flex; justify-content: space-between;">
                <button class="btn-gray" onclick="document.getElementById('paystack-checkout-modal').remove()">Cancel</button>
                <button class="btn-blue" style="background-color:#3bb75e; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:700;" onclick="executeActualPaystackIframePopRuntime(${slotIndex})">Proceed to Payment Method</button>
            </div>
        </div>
    `;
    document.body.appendChild(checkoutModalContainer);
}

function executeActualPaystackIframePopRuntime(slotIndex) {
    console.log("--> Starting Paystack execution for slot:", slotIndex);

    // 1. Verify Paystack script is loaded in HTML
    if (typeof PaystackPop === 'undefined') {
        showTopRightToast("Paystack SDK not loaded! Check your internet connection.", "error");
        return;
    }

    // 2. Validate email input element
    const emailField = document.getElementById("paystack-email-field");
    const userEmail = emailField ? emailField.value : null;

    if (!userEmail) {
        showTopRightToast("Please enter a valid email address before proceeding.", "info");
        return;
    }

    // 3. Safe fallback for APP_STATE user_uid
    const userUid = (typeof APP_STATE !== 'undefined' && APP_STATE.currentUser) 
        ? APP_STATE.currentUser.uid 
        : 'GUEST_USER';

    const targetPrice = LEADERBOARD_SLOT_PRICES[slotIndex];
    const autoRenewToggle = document.getElementById("paystack-autorenew-toggle");
    const isAutoRenewChecked = autoRenewToggle ? autoRenewToggle.checked : false;

    if (typeof SYSTEM_DATABASE !== 'undefined' && SYSTEM_DATABASE.slotMetadata) {
        SYSTEM_DATABASE.slotMetadata[slotIndex].autoRenew = isAutoRenewChecked;
    }

    // Close modal safely if it exists
    const modal = document.getElementById('paystack-checkout-modal');
    if (modal) modal.remove();

    // 4. Build Paystack configuration
    let paymentConfig = {
        key: 'pk_test_8e350f62114983f1cd23b0944668d435a6e74214', 
        email: userEmail,
        amount: targetPrice * 100, 
        currency: "NGN",
        ref: 'FT-LEADERBOARD-' + slotIndex + '-' + Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
            slot_index: slotIndex,
            user_uid: userUid
        },
        callback: function(response) {
            console.log("Payment successful response:", response);
            processPaystackPaymentSuccess(slotIndex);
        },
        onClose: function() {
            showTopRightToast('Payment window closed by customer session.', "info");
        }
    };

    if (isAutoRenewChecked) {
        paymentConfig.plan = LEADERBOARD_PAYSTACK_PLAN_CODES[slotIndex];
    }

    console.log("--> Triggering Paystack Pop setup with config:", paymentConfig);

    try {
        let handler = PaystackPop.setup(paymentConfig);
        handler.openIframe();
    } catch (error) {
        console.error("Paystack Execution Error:", error);
        showTopRightToast("Error launching Paystack modal: " + error.message, "error");
    }
}

function processPaystackPaymentSuccess(slotIndex) {
    const now = Date.now();
    const oneMonthDurationMs = 30 * 24 * 60 * 60 * 1000; // RULE: Valid for only one month[cite: 1]
    
    SYSTEM_DATABASE.slotMetadata[slotIndex].expirationTime = now + oneMonthDurationMs;
    SYSTEM_DATABASE.slotMetadata[slotIndex].previousOwnerUid = APP_STATE.currentUser.uid;
    
    // RULE: Anytime successful payment is made, send message by admin indicating purchase was successful[cite: 1]
    sendFortMartAdminSystemNotification(
        APP_STATE.currentUser.uid, 
        `Payment Successful! You have successfully acquired Leaderboard Slot Position #${slotIndex + 1}. Subscription valid for 1 month.`
    );

    showTopRightToast("Transaction authenticated cleanly by Paystack! Opening product allocation tools...", "success");
    launchManageSlotModal(slotIndex);
}

// RULE: The manage slot should prompt a modal where you can toggle auto-renew and change the product linked to the slot[cite: 1]
function launchManageSlotModal(slotIndex) {
    let existingModal = document.getElementById("manage-slot-allocation-modal");
    if (existingModal) existingModal.remove();

    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard;
    const activeProductId = leaderboard[slotIndex];

    const userOwnedProducts = SYSTEM_DATABASE.products.filter(p => p.ownerUid === APP_STATE.currentUser.uid);
    const unpinnedAvailableProducts = userOwnedProducts.filter(p => !leaderboard.includes(p.pid) || p.pid === activeProductId);

    const managementModalContainer = document.createElement("div");
    managementModalContainer.id = "manage-slot-allocation-modal";
    managementModalContainer.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;";

    let dropdownSelectionHTML = `<option value="">-- No Product Assigned (Vacant) --</option>`;
    if (unpinnedAvailableProducts.length > 0) {
        dropdownSelectionHTML += unpinnedAvailableProducts.map(p => 
            `<option value="${p.pid}" ${p.pid === activeProductId ? 'selected' : ''}>${p.name} [ID: ${p.pid}]</option>`
        ).join("");
    }

    managementModalContainer.innerHTML = `
        <div class="modal-box rounded-rect" style="padding: 24px; max-width: 450px; width: 100%; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
            <h3>⚙️ Manage Leaderboard Slot #${slotIndex + 1}</h3>
            <p style="margin-bottom:14px; font-size:0.85rem; color:var(--fort-gray-slate);">Assign an item post entry directly to this slot, or change assignments.</p>
            
            <div class="form-input-container" style="margin-bottom:16px;">
                <label style="font-weight: 600; display:block; margin-bottom:4px;">Active Associated Product</label>
                <select id="slot-product-mapping-dropdown" class="form-field-control" style="width:100%; padding:8px;">
                    ${dropdownSelectionHTML}
                </select>
            </div>

            <div style="margin-top:12px; font-size:0.8rem; color:var(--fort-gray-slate);">
                * Note: A product can occupy exactly one slot context at any given time.
            </div>

            <div class="btn-group" style="justify-content: flex-end; margin-top:20px; display:flex; gap:10px;">
                <button class="btn-gray" onclick="document.getElementById('manage-slot-allocation-modal').remove()">Close Window</button>
                <button class="btn-blue" onclick="saveSlotAllocationSettingsMapping(${slotIndex})">Save Allocation Settings</button>
            </div>
        </div>
    `;
    document.body.appendChild(managementModalContainer);
}

function saveSlotAllocationSettingsMapping(slotIndex) {
    const selectedProductId = document.getElementById("slot-product-mapping-dropdown").value;

    if (selectedProductId === "") {
        SYSTEM_DATABASE.pinnedLeaderboard[slotIndex] = null;
        showTopRightToast("Product unlinked successfully. Slot remains owned but is currently vacant.", "success");
    } else {
        const existingSlotIndex = SYSTEM_DATABASE.pinnedLeaderboard.indexOf(selectedProductId);
        if (existingSlotIndex !== -1 && existingSlotIndex !== slotIndex) {
            showTopRightToast("Error Constraint: This item is already pinned inside another leaderboard tracking container slot node!", "error");
            return;
        }
        SYSTEM_DATABASE.pinnedLeaderboard[slotIndex] = selectedProductId;
        showTopRightToast("Leaderboard slot mapping criteria update applied successfully!", "success");
    }

    const modalElement = document.getElementById("manage-slot-allocation-modal");
    if (modalElement) modalElement.remove();

    administrativeSaveAndRefreshDisplay();
    renderAccountInventoryLedgerManagementDashboardGrid();
}

function cancelActiveSlotSubscription(slotIndexPositionId) {
    if (!SYSTEM_DATABASE.pinnedLeaderboard) return;
    
    displayConfirmationModalOverlayAction("Are you sure you want to cancel this slot positioning subscription setup?", () => {
        SYSTEM_DATABASE.pinnedLeaderboard[slotIndexPositionId] = null;
        SYSTEM_DATABASE.slotMetadata[slotIndexPositionId].expirationTime = null;
        SYSTEM_DATABASE.slotMetadata[slotIndexPositionId].previousOwnerUid = null;
        
        administrativeSaveAndRefreshDisplay();
        renderAccountInventoryLedgerManagementDashboardGrid();
        showTopRightToast("Subscription terminated successfully.", "success");
    });
}

function sendFortMartAdminSystemNotification(userId, messageContentText) {
    if (!SYSTEM_DATABASE.adminMessages) {
        SYSTEM_DATABASE.adminMessages = [];
    }
    SYSTEM_DATABASE.adminMessages.push({
        recipientUid: userId,
        sender: "Fort Mart Admin",
        timestamp: Date.now(),
        message: messageContentText
    });
    console.log(`[Notification Sent to User: ${userId}] From: Admin -> "${messageContentText}"`);
}

function displayConfirmationModalOverlayAction(messageStringText, callbackFunctionReference) {
    const confirmModalNode = document.getElementById("confirm-modal");
    if (!confirmModalNode) return;

    document.getElementById("confirm-modal-text").innerHTML = `
        <p style="margin-bottom: 12px; font-weight: 500;">${messageStringText}</p>
        <div class="form-input-container" style="text-align: left; margin-top: 14px;">
            <label style="font-weight: 700; font-size: 0.85rem; color: var(--fort-blue-dark);">Confirm Security Password Phrase:</label>
            <input type="password" id="delete-verify-password" class="form-field-control" placeholder="Enter secret key to authenticate operation" style="margin-top: 6px; width: 100%; box-sizing: border-box; padding: 6px;">
            <div id="err-delete-reauth-msg" class="text-danger-alert" style="color: red; font-size: 0.8rem; margin-top: 6px; display: none;">Incorrect Authentication Key Pattern Entry</div>
        </div>
        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-delete-showpass" onchange="toggleFormPasswordFieldVisibility(this, 'delete-verify-password')">
            <label for="chk-delete-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Password</label>            
        </div>
    `;

    confirmModalNode.classList.add("active");
    
    const yesButtonNode = document.getElementById("confirm-yes-btn");
    const noButtonNode = document.getElementById("confirm-no-btn");
    yesButtonNode.innerText = "Confirm Action";
    
    const cleanYesNode = yesButtonNode.cloneNode(true);
    const cleanNoNode = noButtonNode.cloneNode(true);
    yesButtonNode.parentNode.replaceChild(cleanYesNode, yesButtonNode);
    noButtonNode.parentNode.replaceChild(cleanNoNode, noButtonNode);
    
    cleanYesNode.addEventListener("click", () => {
        const enteredPassword = document.getElementById("delete-verify-password").value;
        const errNode = document.getElementById("err-delete-reauth-msg");
        
        if (enteredPassword !== APP_STATE.currentUser.secretKey) {
            errNode.style.display = "block";
            return;
        }
        
        errNode.style.display = "none";
        callbackFunctionReference();
        confirmModalNode.classList.remove("active");
    });

    cleanNoNode.addEventListener("click", () => {
        confirmModalNode.classList.remove("active");
    });
}

/** Ratings Interactive Node Matrix Parameters Assignment Management Loop Routines Controllers Elements */
let LOCAL_INTERACTIVE_SESSION_STAR_RATING_SELECTION_SCORE_INTEGER = 0;
function setInteractiveStarScoreRating(selectedScoreInteger) {
    LOCAL_INTERACTIVE_SESSION_STAR_RATING_SELECTION_SCORE_INTEGER = selectedScoreInteger;
    const standardStarsSpanElementsCollectionNodes = document.getElementById("star-input-interactive-row").children;
    
    for(let idx = 0; idx < 5; idx++) {
        if(idx < selectedScoreInteger) {
             standardStarsSpanElementsCollectionNodes[idx].style.color = "#ffb300"; // highlighted operational golden amber color rating node status
        } else {
             standardStarsSpanElementsCollectionNodes[idx].style.color = "var(--fort-gray-border)";
        }
    }
}

function submitPlatformFeedbackToAdminChannel() {
    const feedbackNoteTextVal = document.getElementById("txt-feedback-input-box").value.trim();
    if(feedbackNoteTextVal === "" || LOCAL_INTERACTIVE_SESSION_STAR_RATING_SELECTION_SCORE_INTEGER === 0) {
        alert("Platform structural execution exception report error warning notice tracker: Input structural forms components fields values matrix columns maps arrays entries metrics checks mandates score ratings parameters assignment and non-blank narrative feedback logs entries values before pipeline validation processing runs loops controls.");
        return;
    }
    
    const operationalFeedbackReportFormPackagePayloadNode = {
        fid: "feedback_" + Date.now(),
        userUid: APP_STATE.currentUser ? APP_STATE.currentUser.uid : "anonymous_session_user_node",
        score: LOCAL_INTERACTIVE_SESSION_STAR_RATING_SELECTION_SCORE_INTEGER,
        note: feedbackNoteTextVal,
        timestamp: new Date().toISOString()
    };
    
    SYSTEM_DATABASE.platformFeedback.push(operationalFeedbackReportFormPackagePayloadNode);
    syncPlatformDatabaseStateToWebStorage();
    
    document.getElementById("txt-feedback-input-box").value = "";
    setInteractiveStarScoreRating(0);
    
    alert("System Administration Platform Channel Message Broadcast Response Gateway: Form framework telemetry package parsing evaluated, tracked, processed, compiled, and dispatched safely into admin monitoring arrays channels queues data blocks layers pipeline parameters models metrics values logs records indices.");
}

function openAdminAddSuiteSiteModal() {
    const modalTargetNode = document.getElementById("auth-modal-content");
    modalTargetNode.innerHTML = `
        <h3>[Privileged Admin Link Integration Switch Command Node Framework]</h3>
        <div class="form-input-container margin-top-sm">
            <label>Network Suite Platform Platform Entity Label Label Display Name:</label>
            <input type="text" id="adm-suite-name" class="form-field-control" placeholder="Enter entity system label name string text properties value">
        </div>
        <div class="form-input-container">
            <label>Network Suite Profile Core Operational Context Purpose Summary Note Narrative Block Properties Column:</label>
            <input type="text" id="adm-suite-info" class="form-field-control" placeholder="Brief descriptive metadata tracking framework alignment syntax values properties parameters">
        </div>
        <div class="form-input-container">
            <label>Uniform Resource Locator System Endpoint Routing Target Channel URL Link Address Syntax String Path Structure Context:</label>
            <input type="text" id="adm-suite-url" class="form-field-control" placeholder="https://example-suite-node.fort.net">
        </div>
        <div class="btn-group">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Discard Link Record</button>
            <button onclick="executeAdminPipelineSaveNewSuiteEntityLinkNodeRecordRowItem()" class="btn-blue">Publish Network Node Entity Link</button>
        </div>
    `;
    document.getElementById("auth-modal").classList.add("active");
}

function executeAdminPipelineSaveNewSuiteEntityLinkNodeRecordRowItem() {
    const name = document.getElementById("adm-suite-name").value.trim();
    const info = document.getElementById("adm-suite-info").value.trim();
    const url = document.getElementById("adm-suite-url").value.trim();
    
    if(name === "" || info === "" || url === "") {
        alert("Admin Exception Intercept Report Notification Error Trace Summary Log Warning Pointer Alert Struct: Missing tracking properties baseline parameters metrics columns items records matrix fields checks indices data values mapping configuration models rules parameters keys pointers elements.");
        return;
    }
    
    SYSTEM_DATABASE.networkSuiteEntities.push({ siteId: "s_" + Date.now(), logo: "", name: name, info: info, url: url });
    syncPlatformDatabaseStateToWebStorage();
    closeActiveModalDirectly('auth-modal');
    populateNetworkSuiteExtensionsDisplayView();
    alert("Admin Framework Master Ledger Synchronization Engine: Added entity block safely.");
}

/**
 * Privileged Platform System Monitoring Operations Analytics Calculation Metrics Control Module Subsystem
 */
function recalculateSystemAnalyticalMetricsSummary(selectedTimeframeContextStringValueWindowValueStringKey) {
    // Generate pseudo randomized tracking metrics numbers logs values profiles arrays shifts constrained safely checking filters
    const hoursLabelNode = document.getElementById("lbl-metric-hours");
    const topProdLabelNode = document.getElementById("lbl-metric-top-product");
    const topUserLabelNode = document.getElementById("lbl-metric-top-user");
    
    if(selectedTimeframeContextStringValueWindowValueStringKey === 'Today') {
        hoursLabelNode.innerText = "42 Hrs Active Session Execution Telemetry Logs";
        topProdLabelNode.innerText = "Smart OLED Television Set 4K Set Frame Array [ID: #p2]";
        topUserLabelNode.innerText = "Anonymous Client Broker Session Node Line Trace Vector Pointer #742";
    } else if(selectedTimeframeContextStringValueWindowValueStringKey === 'Yesterday') {
        hoursLabelNode.innerText = "94 Hrs Aggregated Cluster Session Close Log Execution Telemetry Logs";
        topProdLabelNode.innerText = "Premium Wireless Noise-Cancelling Headphones [ID: #p1]";
        topUserLabelNode.innerText = "Sarah Enterprise Hub (ID: #user_sarah)";
    } else {
        hoursLabelNode.innerText = "1,482 Hrs Total Active Running Service Infrastructure Analytics Logs Telemetry Parameters Matrix Units Metrics Data Profiles Elements Lines";
        topProdLabelNode.innerText = "Premium Wireless Noise-Cancelling Headphones System Inventory Component Log Baseline Registry Asset [ID: #p1]";
        topUserLabelNode.innerText = "Sarah Enterprise Hub Tracking Infrastructure Identity Master Accounting Ledger Profile Mapping Key Node Target Token Value Row #user_sarah Register Metrics Analysis";
    }
}

function executeFilteringSettingsContentPaneRowsNodesDisplay(searchQueryStringTextStringSyntaxPhrase) {
     const structuralSettingsPanelsElementsCollectionRowsArray = document.querySelectorAll(".settings-sub-panel div");
     structuralSettingsPanelsElementsCollectionRowsArray.forEach(nodeBlock => {
          if(nodeBlock.innerText.toLowerCase().includes(searchQueryStringTextStringSyntaxPhrase)) {
               nodeBlock.style.opacity = "1";
          } else {
               nodeBlock.style.opacity = "0.4"; // soft dimmer scaling to assist navigation discovery mapping indicators traces bounds
          }
     });
}

/**
 * Detailed Profile Presentation Context Overlay Summary Modal Processing Architecture Engine
 * Renders extended data layouts, business certificates, metrics parameters, and product lists for a given user profile.
 */
function launchDetailedUserProfileContextOverlaySummaryModal(userIdTokenKeyParameterValue, pushHistory = true) {
    const targetUserObjMatchRecord = SYSTEM_DATABASE.users.find(u => u.uid === userIdTokenKeyParameterValue || u.id === userIdTokenKeyParameterValue);
    if (!targetUserObjMatchRecord) return;
    const standardModalBodyElementNode = document.getElementById("product-detail-modal-body");
    if (!standardModalBodyElementNode) return;
    
    // 1. Dynamic Page Title Update
    const displayName = targetUserObjMatchRecord.businessName || targetUserObjMatchRecord.identityName || targetUserObjMatchRecord.username || 'User Profile';
    document.title = `${displayName} | Fort Mart`;

    // 2. Dynamic URL Update (FIXED: Checks if parameter is already set to prevent URL resets)
    if (pushHistory) {
        const targetUid = targetUserObjMatchRecord.uid || targetUserObjMatchRecord.id;
        const currentParams = new URLSearchParams(window.location.search);
        
        // Only push new state if the current URL isn't already matching this user's UID
        if (currentParams.get('uid') !== String(targetUid)) {
            const userSlug = typeof createUserSlug === 'function' 
                ? createUserSlug(displayName) 
                : typeof createProductSlug === 'function' 
                    ? createProductSlug(displayName) 
                    : displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('user', userSlug);
            currentUrl.searchParams.set('uid', targetUid);
            
            window.history.pushState({ uid: targetUid }, "", currentUrl.toString());
        }
    }

    let subAccountClassificationMetadataDetailsBlockHTML = "";
    if (targetUserObjMatchRecord.accountType === 'business' || targetUserObjMatchRecord.type === 'business') {
         subAccountClassificationMetadataDetailsBlockHTML = `
             <div style="background-color:var(--fort-white-snow); padding:14px; border:1px solid var(--fort-gray-border);" class="rounded-rect margin-top-xs">
                 <h5 style="text-transform:uppercase; font-size:0.7rem; color:var(--fort-gray-slate); letter-spacing:0.5px;">User's Name and Info</h5>
                 <p style="font-size:0.95rem; font-weight:700; color:var(--fort-blue-dark); margin-top:4px;">${targetUserObjMatchRecord.businessName || ''}</p>
                 <p style="font-size:0.88rem; color:var(--fort-blue-primary); line-height:1.4; margin-top:4px;">${targetUserObjMatchRecord.businessInfo || ''}</p>
             </div> 
         `;
    } else {
         subAccountClassificationMetadataDetailsBlockHTML = `
             <div style="background-color:var(--fort-white-snow); padding:14px; border:1px solid var(--fort-gray-border);" class="rounded-rect margin-top-xs">
                 <h5 style="text-transform:uppercase; font-size:0.7rem; color:var(--fort-gray-slate); letter-spacing:0.5px;">User's Name and Info</h5>
                 <p style="font-size:0.95rem; font-weight:700; color:var(--fort-blue-dark); margin-top:4px;">${targetUserObjMatchRecord.identityName || targetUserObjMatchRecord.username || ''}</p>
             </div>
         `;
    }

    // --- ADMINISTRATIVE CONTROL LAYER LINKED TO EXECUTEINLINEADMINSAVE ---
    let administrativeControlsInlineHTML = "";
    if (APP_STATE.currentUser && (APP_STATE.currentUser.uid === 'admin' || APP_STATE.currentUser.id === 'admin')) {
        const rawVerificationCode = targetUserObjMatchRecord.UserAccountAuthenticationVerificationCode || targetUserObjMatchRecord.verificationCode || 'N/A';
        const currentGovernanceStatus = targetUserObjMatchRecord.verificationStatus || targetUserObjMatchRecord.status || 'unverified';
        const currentAccountType = targetUserObjMatchRecord.accountType || targetUserObjMatchRecord.type || 'personal';
        const registrationContactIdentifier = targetUserObjMatchRecord.identifierText || '';
        const securityAccessPassword = targetUserObjMatchRecord.secretKey || targetUserObjMatchRecord.password || '';
        const uid = targetUserObjMatchRecord.uid || targetUserObjMatchRecord.id || '';
        
        administrativeControlsInlineHTML = `
            <div style="margin-top:12px; margin-bottom:12px; padding:14px; background:#f7fafc; border:1px solid #cbd5e0; border-radius:8px; display:flex; flex-direction:column; gap:10px;">
                <h5 style="margin:0; text-transform:uppercase; font-size:0.75rem; color:var(--fort-gray-slate); letter-spacing:0.5px;">🛡️ Administrative Console Workspace</h5>
                
                <div style="display:flex; gap:8px;">
                    <div style="flex:1;">
                        <span style="font-size:0.82rem; color:var(--fort-gray-slate); font-weight:700;">Registration Contact (Email / Phone):</span>
                        <input type="text" id="adm-user-identifier-text" class="form-field-control" style="margin-top:4px; font-family:monospace;" value="${registrationContactIdentifier}">
                    </div>
                    <div style="flex:1;">
                        <span style="font-size:0.82rem; color:var(--fort-gray-slate); font-weight:700;">Account Password:</span>
                        <input type="text" id="adm-user-security-password" class="form-field-control" style="margin-top:4px; font-family:monospace;" value="${securityAccessPassword}">
                    </div>
                </div>

                <div>
                    <span style="font-size:0.82rem; color:var(--fort-gray-slate); font-weight:700;">Account Signup Authentication Verification Code:</span>
                    <input type="text" id="UserAccountAuthenticationVerificationCode" class="form-field-control" style="margin-top:4px;" value="${rawVerificationCode}">
                </div>

                <div>
                    <span style="font-size:0.82rem; color:var(--fort-gray-slate); font-weight:700;">User ID:</span>
                    <input type="text" id="UserIdAdminSeen" class="form-field-control" style="margin-top:4px;" value="${uid}" disabled >
                </div>

                <div>
                    <span style="font-size:0.82rem; color:var(--fort-gray-slate); font-weight:700;">Manage Account Type Privilege:</span>
                    <select id="adm-change-account-type" class="form-field-control" style="margin-top:4px;">
                        <option value="personal" ${currentAccountType === 'personal' ? 'selected' : ''}>Personal Account</option>
                        <option value="business" ${currentAccountType === 'business' ? 'selected' : ''}>Business (Commercial) Account</option>
                    </select>
                </div>
                
                <div style="font-size:0.82rem; color:var(--fort-blue-dark); margin-top:2px;">
                    Current Status Boundary: <strong id="lbl-inspector-active-status-tag" data-pending-status-value="${currentGovernanceStatus}" style="text-transform:uppercase;">${currentGovernanceStatus}</strong>
                </div>
                
                <div class="btn-group" style="margin-top:4px;">
                    <button class="btn-blue" style="padding:6px 12px; font-size:0.8rem;" onclick="executeInlineAdminSave('${targetUserObjMatchRecord.uid || targetUserObjMatchRecord.id}')">Apply Policy Changes</button>
                    <button class="btn-gray" style="padding:6px 12px; font-size:0.8rem;" onclick="(() => {
                        const tag = document.getElementById('lbl-inspector-active-status-tag');
                        const nextStatus = tag.getAttribute('data-pending-status-value') === 'verified' ? 'unverified' : 'verified';
                        tag.setAttribute('data-pending-status-value', nextStatus);
                        tag.textContent = nextStatus;
                    })()">Toggle Verification Identity State</button>
                </div>
            </div>
        `;
    }

    // --- USER'S PRODUCTS GRID VIEW LOOP LAYER ---
    let userProductsListHTML = "";
    if (targetUserObjMatchRecord.accountType === 'business' || targetUserObjMatchRecord.type === 'business') {
        let currencySymbol = (!APP_STATE.currentUser || APP_STATE.currentUser.country === 'Nigeria') ? '₦' : '$';
        const sellerProducts = SYSTEM_DATABASE.products.filter(p => p.ownerUid === targetUserObjMatchRecord.uid || p.ownerUid === targetUserObjMatchRecord.id);
        
        let productsGridItemsHTML = "";
        if (sellerProducts.length > 0) {
            sellerProducts.forEach(product => {
                const imgUrl = product.coverPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e0'><path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/></svg>";
                productsGridItemsHTML += `
                    <div class="profile-product-item-row" style="display:flex; align-items:center; gap:12px; padding:8px; background:var(--fort-white-snow); border:1px solid var(--fort-gray-border); border-radius:6px; cursor:pointer; transition:background 0.2s;" onclick="closeActiveModalDirectly('product-detail-modal'); launchComprehensiveProductSpecificationsExpandedModalView('${product.pid}')" onmouseover="this.style.background='#f0f4f8'" onmouseout="this.style.background='var(--fort-white-snow)'">
                        <img src="${imgUrl}" style="width:50px; height:50px; object-fit:contain; border-radius:4px; background:#fcfcfc; border:1px solid #e2e8f0;" alt="${product.name}">
                        <div style="flex:1; min-width:0;">
                            <h4 style="margin:0; font-size:0.9rem; color:var(--fort-blue-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${product.name}</h4>
                            <div style="font-size:0.85rem; font-weight:700; color:var(--fort-blue-light); margin-top:2px;">${currencySymbol}${product.price.toLocaleString()}</div>
                        </div>
                        <span style="font-size:1.1rem; color:var(--fort-gray-slate); padding-right:4px;">›</span>
                    </div>
                `;
            });
        } else {
            productsGridItemsHTML = `<p style="font-size:0.88rem; color:var(--fort-gray-slate); font-style:italic; margin:0; padding:4px;">This business user does not have any active product.</p>`;
        }

        userProductsListHTML = `
            <div class="user-products-section-block" style="margin-top:14px; margin-bottom:14px;">
                <h5 style="text-transform:uppercase; font-size:0.75rem; color:var(--fort-gray-slate); letter-spacing:0.5px; margin-bottom:8px;">Active Product Catalog Roster (${sellerProducts.length})</h5>
                <div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px;">
                    ${productsGridItemsHTML}
                </div>
            </div>
        `;
    }

    let userProfilePhotoSrc = targetUserObjMatchRecord.avatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    
    standardModalBodyElementNode.innerHTML = `
        <div class="modal-expanded-header-row" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--fort-gray-border); padding-bottom:14px;">
            <h3>User Profile Info</h3>
            <button onclick="closeProductSpecificationOverlay('product-detail-modal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">✕</button>
        </div>
        
        <div class="modal-expanded-content-split-grid margin-top-md" style="display:grid; grid-template-columns: 100px 1fr; gap:20px; align-items:start;">
            <div class="profile-left-avatar-frame">
                <img src="${userProfilePhotoSrc}" class="circle-container" style="width:100px; height:100px; object-fit:cover; border:2px solid var(--fort-blue-primary);" alt="User Profile Master Photo">
            </div>
            
            <div class="profile-right-fields-column" style="display:flex; flex-direction:column;">
                <h2 style="color:var(--fort-blue-dark); font-weight:800; margin:0;">${targetUserObjMatchRecord.identityName || ''}</h2>
                <span style="font-size:0.82rem; color:var(--fort-gray-slate); margin-top:2px;">Account Class: <strong style="text-transform:uppercase;">${targetUserObjMatchRecord.accountType || targetUserObjMatchRecord.type || 'personal'}</strong></span>
                <span style="font-size:0.82rem; color:var(--fort-gray-slate); margin-top:2px;">Operational Country/Region: <strong>${targetUserObjMatchRecord.country || 'Nigeria'}</strong></span>
                
                ${subAccountClassificationMetadataDetailsBlockHTML}
                ${administrativeControlsInlineHTML}
                ${userProductsListHTML}
                
                <div class="modal-expanded-actions-footer-row btn-group" style="margin-top:12px; padding-top:14px; border-top:1px solid #f0f0f0;">
                    <button class="btn-gray" onclick="closeActiveModalDirectly('product-detail-modal')">Close</button>
                    ${(APP_STATE.currentUser && APP_STATE.currentUser.uid !== targetUserObjMatchRecord.uid) ? `<button class="btn-blue" onclick="closeActiveModalDirectly('product-detail-modal'); initialDirectMessageCommunicationPipelineSetup('${targetUserObjMatchRecord.uid || targetUserObjMatchRecord.id}')">💬 Message Seller</button>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById("product-detail-modal").classList.add("active");
}

/**
 * Commits administrative code alterations, status values, and account classification switches.
 */
function executeInlineAdminSave(userId) {
    const accountInstance = SYSTEM_DATABASE.users.find(u => u.id === userId || u.uid === userId);
    if (!accountInstance) return;

    // 1. Process status tracking strings
    const cachedStatusElement = document.getElementById("lbl-inspector-active-status-tag");
    const evaluatedStatusValue = cachedStatusElement && cachedStatusElement.getAttribute("data-pending-status-value") 
        ? cachedStatusElement.getAttribute("data-pending-status-value") 
        : (accountInstance.verificationStatus || accountInstance.status || 'unverified');

    accountInstance.verificationStatus = evaluatedStatusValue;
    accountInstance.status = evaluatedStatusValue;

    // 2. Process manual identifier Text updates (Email / Phone)
    const inputIdentifierField = document.getElementById("adm-user-identifier-text");
    if (inputIdentifierField) {
        const structuralIdentifierValue = inputIdentifierField.value.trim();
        accountInstance.identifierText = structuralIdentifierValue; // Keeps match properties intact
    }

    // 3. Process manual password updates
    const inputPasswordField = document.getElementById("adm-user-security-password");
    if (inputPasswordField) {
        const operationalPasswordValue = inputPasswordField.value.trim();
        accountInstance.secretKey = operationalPasswordValue;
        accountInstance.password = operationalPasswordValue; // Overwrite fallback keys matching design schema
    }

    // 4. Process manual code variables alterations
    const inputCodeField = document.getElementById("UserAccountAuthenticationVerificationCode");
    if(inputCodeField) {
        const boundValue = inputCodeField.value.trim();
        accountInstance.UserAccountAuthenticationVerificationCode = boundValue;
        accountInstance.verificationCode = boundValue;
    }

    // 5. Process account type change toggles
    const accountTypeSelectField = document.getElementById("adm-change-account-type");
    if(accountTypeSelectField) {
        const selectedType = accountTypeSelectField.value;
        accountInstance.accountType = selectedType;
        accountInstance.type = selectedType;
        
        if (selectedType === 'business') {
            if (!accountInstance.businessName) {
                accountInstance.businessName = accountInstance.identityName || accountInstance.username || "Corporate Entity";
            }
            if (!accountInstance.businessInfo) {
                accountInstance.businessInfo = "Commercial business distribution account profile workspace.";
            }
        }
    }

    // Sync modifications into web state storage containers
    if (typeof syncPlatformDatabaseStateToWebStorage === "function") {
        syncPlatformDatabaseStateToWebStorage();
    } else if (typeof commitDatabasesStateToLocalStorage === "function") {
        commitDatabasesStateToLocalStorage();
    }
    
    if (typeof renderAdminUsersManagementList === "function") {
        renderAdminUsersManagementList();
    }

    closeActiveModalDirectly("product-detail-modal");
    
    if (typeof showAlertModal === "function") {
        showAlertModal("Overwrites Saved", "Target credentials variables, account type matrices, and identity parameters permanently written to the registry.");
    } else {
        showTopRightToast("Overwrites Saved successfully.", "success");
    }
}

/**
 * NEW: Displays the password secure logout prompt layout
 */
function openLogoutConfirmationModal() {
    const passInput = document.getElementById("logout-auth-password");
    const errNode = document.getElementById("err-logout-password");
    
    if (passInput) passInput.value = "";
    if (errNode) errNode.classList.add("hidden-node");
    
    const logoutModal = document.getElementById("logout-confirm-modal");
    if (logoutModal) logoutModal.classList.add("active");
}

/**
 * NEW: Verifies secret key credentials before clearing security cookie tokens 
 */
function executeSecureAccountLogout() {
    const errNode = document.getElementById("err-logout-password");
    const passwordInput = document.getElementById("logout-auth-password").value;
    
    errNode.classList.add("hidden-node");

    if (typeof APP_STATE === 'undefined' || !APP_STATE.currentUser) {
        // Fallback if system app state configuration drops cleanly out of loop bounds
        performGlobalSessionPurge();
        return;
    }

    // Authenticate the current context user against the stored database match record
    if (APP_STATE.currentUser.secretKey !== passwordInput) {
        errNode.innerText = "Incorrect password. Logout verification failed.";
        errNode.classList.remove("hidden-node");
        return;
    }

    // Verification successful, execute state clear
    performGlobalSessionPurge();
    changelogoutosignupviceVersafunctionTwo();
}

/**
 * NEW: Secondary clean workflow execution to clear cookies, DOM classes, and structural roots
 */
function performGlobalSessionPurge() {
    // Clear both the active device cookie trace and local storage fallback keys cleanly
    eraseSecureAuthCookie("fort_mart_logged_uid");
    localStorage.removeItem("fort_mart_cookie_fallback_uid");

    // Force application view panels directly back to the home page display layout
    document.querySelectorAll(".view-page").forEach(page => {
        page.classList.add("hidden-view");
        page.classList.remove("active-view");
    });
    
    const homePageElement = document.getElementById("page-home");
    if (homePageElement) {
        homePageElement.classList.add("active-view");
        homePageElement.classList.remove("hidden-view");
        if (typeof APP_STATE !== 'undefined') {
            APP_STATE.activeViewPage = 'home';
        }
    }

    if (typeof APP_STATE !== 'undefined') {
        APP_STATE.currentUser = null;
    }

    closeActiveModalDirectly('logout-confirm-modal');

    const adminNavItem = document.getElementById("admin-nav-item");
    const adminSuiteBtn = document.getElementById("admin-add-suite-site-btn");
    if (adminNavItem) adminNavItem.classList.add("hidden-admin-node");
    if (adminSuiteBtn) adminSuiteBtn.classList.add("hidden-node");

    const navUserAvatar = document.getElementById("nav-user-avatar");
    if (navUserAvatar) {
        navUserAvatar.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    }

    if (typeof renderMarketplaceProductsDisplayLoop === 'function') {
        renderMarketplaceProductsDisplayLoop();
    }
    
    syncDrawerGuestTerminalNodeToActiveUserfunctiontwo();
    triggerAuthenticationModalSequence();
}


/**
 * Updates the user drawer terminal node values based on the active authenticated session state data
 */
function syncDrawerGuestTerminalNodeToActiveUser() {
    // Ensure there is an active logged-in user available
    if (!APP_STATE || !APP_STATE.currentUser) {
        return;
    }

    const currentAccount = APP_STATE.currentUser;
    
    // 1. Resolve DOM node elements references matching target layout criteria
    const drawerAvatarNode = document.getElementById("drawer-user-avatar-frame-node");
    
    // 2. Locate h4 label component and span label component relative to parent layout container card
    const headerCardPane = document.querySelector(".drawer-header-pane-card");
    
    if (headerCardPane) {
        const nameHeadingNode = headerCardPane.querySelector("h4");
        const statusSpanNode = headerCardPane.querySelector("span");
        
        // Update user identity display text label strings context definitions
        if (nameHeadingNode) {
            nameHeadingNode.innerText = currentAccount.identityName; // Changes "Guest Terminal Node" to actual name
        }
        
        if (statusSpanNode) {
            statusSpanNode.innerText = "Logged In Active"; // Changes status
            // Optional: add active system theme layout modification class styles here
            statusSpanNode.style.color = "#48bb78"; // Light green indicating active online node state tracking
        }
    }

    // 3. Update profile avatar display image resource mapping strings fallback paths
    if (drawerAvatarNode) {
        drawerAvatarNode.src = currentAccount.avatar || 
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    }
}

function changelogoutosignupviceVersa() {
    // 2. Locate h4 label component and span label component relative to parent layout container card
    const statusSpanNodetwo = document.getElementById("changeable-logout-btn");
    
    if (statusSpanNodetwo) {
        statusSpanNodetwo.innerText = "Logout"; // Changes status
        statusSpanNodetwo.className = "btn-danger"; // Red indicating Logout
    }   
}

function doubleButtonFunction() {
    if(!APP_STATE.currentUser) {
        triggerAuthenticationModalSequence();
        return;
    }
    
    openLogoutConfirmationModal();
}

function changelogoutosignupviceVersafunctionTwo() {
    // 2. Locate h4 label component and span label component relative to parent layout container card
    const statusSpanNodetwo = document.getElementById("changeable-logout-btn");
    
    if (statusSpanNodetwo) {
        statusSpanNodetwo.innerText = "Sign in"; // Changes status
        statusSpanNodetwo.className = "btn-blue"; // Blue indicating sign in
    }   
}

function syncDrawerGuestTerminalNodeToActiveUserfunctiontwo() {
    
    // 1. Resolve DOM node elements references matching target layout criteria
    const drawerAvatarNode = document.getElementById("drawer-user-avatar-frame-node");
    
    // 2. Locate h4 label component and span label component relative to parent layout container card
    const headerCardPane = document.querySelector(".drawer-header-pane-card");
    
    if (headerCardPane) {
        const nameHeadingNode = headerCardPane.querySelector("h4");
        const statusSpanNode = headerCardPane.querySelector("span");
        
        // Update user identity display text label strings context definitions
        if (nameHeadingNode) {
            nameHeadingNode.innerText = "Guest Terminal Node"; // Changes "Guest Terminal Node" to actual name
        }
        
        if (statusSpanNode) {
            statusSpanNode.innerText = "Logged Out (Guest)"; // Changes status
            // Optional: add active system theme layout modification class styles here
            statusSpanNode.className = "profile-mode-tag-label personal" // Light green indicating active online node state tracking
            statusSpanNode.style.color = "#4a5568"
        }
    }

    // 3. Update profile avatar display image resource mapping strings fallback paths
    if (drawerAvatarNode) {
        drawerAvatarNode.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";
    }
}

/**
 * Fort Mart Preloader and Progress Meter Controller Hook
 */
document.addEventListener("DOMContentLoaded", () => {
    const preloader = document.getElementById("preloader-container");
    const progressBar = document.getElementById("preloader-progress-bar");
    const progressText = document.getElementById("preloader-percentage-text");

    if (!preloader || !progressBar) return;

    let progress = 0;
    const duration = 3000; // Total loading screen time (3 seconds)
    const intervalTime = 30; // Update step resolution in milliseconds
    const step = (intervalTime / duration) * 100;

    const progressInterval = setInterval(() => {
        progress += step;

        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            
            // Turn completely solid blue in its final stage
            progressBar.classList.add("fully-complete");
            progressBar.style.width = "100%";
            progressText.innerText = "Ready!";

            // Smoothly remove preloader after reaching full status
            setTimeout(() => {
                preloader.classList.add("fade-out");
                
                // Let other state machine rendering scripts safely execute after opening
                if (typeof initApplicationState === 'function') {
                    initApplicationState();
                }
            }, 400); // Tiny delay to let the user see the 100% complete state
        } else {
            progressBar.style.width = `${progress}%`;
            progressText.innerText = `Loading ${Math.floor(progress)}%`;

            // Change to complete blue within the last 1-2 seconds of loading 
            if (progress >= 66) { 
                progressBar.classList.add("fully-complete");
            }
        }
    }, intervalTime);
});

function executeSystemicSubscriptionExpirationLifecycleCheck() {
    // Safety Guard: Force arrays to exist natively if WebStorage didn't have them yet
    if (!SYSTEM_DATABASE.pinnedLeaderboard) {
        SYSTEM_DATABASE.pinnedLeaderboard = Array(20).fill(null);
    }
    if (!SYSTEM_DATABASE.slotMetadata) {
        SYSTEM_DATABASE.slotMetadata = Array(20).fill(null).map(() => ({
            expirationTime: null,
            autoRenew: true,
            previousOwnerUid: null
        }));
    }

    const now = Date.now();
    const leaderboard = SYSTEM_DATABASE.pinnedLeaderboard;
    const metadata = SYSTEM_DATABASE.slotMetadata;
    const oneMonthDurationMs = 30 * 24 * 60 * 60 * 1000;

    for (let idx = 0; idx < 20; idx++) {
        const slotMeta = metadata[idx];
        if (!slotMeta || !slotMeta.expirationTime) continue;

        if (now > slotMeta.expirationTime) {
            const ownerUid = slotMeta.previousOwnerUid;

            if (slotMeta.autoRenew) {
                slotMeta.expirationTime = now + oneMonthDurationMs;
                sendFortMartAdminSystemNotification(
                    ownerUid, 
                    `Auto-Renew Successful! Your subscription for Leaderboard Slot Position #${idx + 1} has been automatically extended for 1 month.`
                );
            } else {
                const gracePeriodEnd = slotMeta.expirationTime + (24 * 60 * 60 * 1000);

                if (leaderboard[idx] !== null) {
                    leaderboard[idx] = null; 
                    sendFortMartAdminSystemNotification(
                        ownerUid, 
                        `Your slot ownership period has expired! Please renew within 24 hours or the slot will become available for other users to purchase.`
                    );
                }

                if (now > gracePeriodEnd) {
                    slotMeta.previousOwnerUid = null;
                    slotMeta.expirationTime = null;
                    sendFortMartAdminSystemNotification(ownerUid, `Your 24-hour grace renewal period has lapsed. Slot Position #${idx + 1} is now public.`);
                }
            }
        }
    }
}

/**
 * Step 1: Launches password confirmation field layout tracking validation checks
 */
function launchEditProductInventoryModalFormLayoutShell(targetProductIdKeyValueString) {
    const targetProduct = SYSTEM_DATABASE.products.find(p => p.pid === targetProductIdKeyValueString);
    if (!targetProduct) {
        showTopRightToast("Product record could not be found.", "error");
        return;
    }

    const modalContentTargetNode = document.getElementById("auth-modal-content");
    modalContentTargetNode.innerHTML = `
        <h3>Enter Current Password (Step 1 of 2)</h3>

        <div class="form-input-container margin-top-sm">
            <label>Active Password:</label>
            <input type="password" id="edit-verify-password" class="form-field-control" placeholder="Enter password to verify ownership context">
            
            <div id="err-edit-reauth-msg" class="text-danger-alert hidden-node">Incorrect Password</div>
        </div>

        <div style="margin-top: 6px; display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="chk-edit-showpass" onchange="toggleFormPasswordFieldVisibility(this, 'edit-verify-password')">
            <label for="chk-edit-showpass" style="font-size: 0.8rem; font-weight: 400; cursor: pointer; user-select: none;">Show Password</label>            
        </div>

        <div class="text-center margin-top-xs">
            <span style="color:var(--fort-blue-light); cursor:pointer; font-size:0.9rem;" onclick="renderForgotPasswordModalWorkflow()">Forgot Password?</span>
        </div>
        <br>
        
        <div class="btn-group">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel</button> 
            <button onclick="verifyEditPasswordAndProceedNonFirebase('${targetProductIdKeyValueString}')" class="btn-blue">Verify Password Phrase</button>
        </div>
    `;
    document.getElementById("auth-modal").classList.add("active");
}

/**
 * Validates the password inline and proceeds to Step 2 form view
 */
function verifyEditPasswordAndProceedNonFirebase(targetProductIdKeyValueString) {
    const enteredPassword = document.getElementById("edit-verify-password").value;
    const errNode = document.getElementById("err-edit-reauth-msg");
    
    errNode.classList.add("hidden-node");
    
    if (enteredPassword !== APP_STATE.currentUser.secretKey) {
        errNode.innerText = "Incorrect Password"; 
        errNode.classList.remove("hidden-node"); 
        return;
    }
    
    // Proceed to Step 2 Form Presentation
    renderActualEditProductFormNonFirebase(targetProductIdKeyValueString);
}

/**
 * Step 2: Displays information inputs for the specified asset post
 */
function renderActualEditProductFormNonFirebase(targetProductIdKeyValueString) {
    const targetProduct = SYSTEM_DATABASE.products.find(p => p.pid === targetProductIdKeyValueString);
    if (!targetProduct) return;

    const modalContentTargetNode = document.getElementById("auth-modal-content");
    modalContentTargetNode.innerHTML = `
        <h3>Edit Product Details (Step 2 of 2)</h3>
        <p style="font-size:0.8rem; color:var(--fort-gray-slate); margin-top:2px;">Updating information for your listed commercial asset.</p>
        
        <div class="form-input-container margin-top-sm">
            <label>Product Name</label>
            <input type="text" id="editprod-name" class="form-field-control" placeholder="Enter concise commercial inventory title text" value="${targetProduct.name}">
        </div>
        
        <div class="form-input-container">
            <label>Select Logistics Catalog Classification Category:</label>
            <select id="editprod-cat" class="form-field-control">
                <option value="Electrical Appliances" ${targetProduct.category === 'Electrical Appliances' ? 'selected' : ''}>Electrical Appliances</option>
                <option value="Mobile Devices & Computers" ${targetProduct.category === 'Mobile Devices & Computers' ? 'selected' : ''}>Mobile Devices & Computers</option>
                <option value="Home Furniture" ${targetProduct.category === 'Home Furniture' ? 'selected' : ''}>Home Furniture</option>
                <option value="Fashion Clothing Apparel" ${targetProduct.category === 'Fashion Clothing Apparel' ? 'selected' : ''}>Fashion Clothing Apparel</option>
                <option value="Beauty & Personal Care" ${targetProduct.category === 'Beauty & Personal Care' ? 'selected' : ''}>Beauty & Personal Care</option>
                <option value="Sports, Fitness and Outdoors" ${targetProduct.category === 'Sports, Fitness and Outdoors' ? 'selected' : ''}>Sports, Fitness and Outdoors</option>
                <option value="Groceries & Essentials" ${targetProduct.category === 'Groceries & Essentials' ? 'selected' : ''}>Groceries & Essentials</option>
                <option value="Others" ${targetProduct.category === 'Others' ? 'selected' : ''}>Others</option>
            </select>
        </div>
        
        <div class="form-input-container">
            <label>Primary Short Public Marketing Overview Description (Max 100 Chars):</label>
            <input type="text" id="editprod-info" class="form-field-control" maxlength="100" placeholder="Max 100 text characters" value="${targetProduct.info}">
        </div>
        
        <div class="form-input-container-image">
            <label>Update Product Image</label>
            <div class="preview-box" style="min-height: 100px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; margin-bottom: 10px;">
                <span id="placeholderTextimg" style="display: none;">No image selected</span>
                <img id="imagePreview" src="${targetProduct.coverPhoto}" alt="Image Preview" style="max-width: 100%; max-height: 200px; display: block;">
            </div>
            <input type="file" id="imageInput" accept="image/*">
        </div>
        <br>
        
        <div class="form-input-container">
            <label>More Info and Specifications</label>
            <textarea id="editprod-aiinfo" class="form-field-control rounded-rect" style="height:60px;" placeholder="A more detailed explanation of product.">${targetProduct.aiInfo}</textarea>
        </div>
        
        <div class="form-input-container">
            <label>Unit Commercial Pricing Valuation Baseline Quote Amount Number (${APP_STATE.currentUser.country === 'Nigeria' ? '₦' : '$'}):</label>
            <input type="number" id="editprod-price" class="form-field-control" placeholder="Enter numeric base rate" value="${targetProduct.price}">
        </div>
        
        <div class="btn-group margin-top-md">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Cancel Changes</button>
            <button onclick="executePipelineCommitUpdatedInventoryPostRecord('${targetProduct.pid}')" class="btn-blue">Save Changes</button>
        </div>
    `;
    setupImagePreviewListener();
}

function executePipelineCommitUpdatedInventoryPostRecord(targetProductIdKeyValueString) {
    const name = document.getElementById("editprod-name").value.trim();
    const cat = document.getElementById("editprod-cat").value;
    const info = document.getElementById("editprod-info").value.trim();
    const imagePreview = document.getElementById("imagePreview");
    const aiInfo = document.getElementById("editprod-aiinfo").value.trim();
    const priceRaw = document.getElementById("editprod-price").value;
    
    if(name === "" || info === "" || priceRaw === "" || !imagePreview.src || imagePreview.src === "") {
        showTopRightToast("All compulsory info must be imputed.", "info");
        return;
    }
    
    const productStructuralIndexMatchId = SYSTEM_DATABASE.products.findIndex(p => p.pid === targetProductIdKeyValueString);
    if(productStructuralIndexMatchId !== -1) {
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].name = name;
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].category = cat;
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].info = info;
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].price = parseFloat(priceRaw);
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].coverPhoto = imagePreview.src;
        SYSTEM_DATABASE.products[productStructuralIndexMatchId].aiInfo = aiInfo || "Standard platform baseline listed trading stock profile object reference specifications tracking structure model elements values data parameters.";
        
        syncPlatformDatabaseStateToWebStorage();
        
        closeActiveModalDirectly('auth-modal');
        showTopRightToast("Product Details Updated Successfully", "success");
        
        renderAccountInventoryLedgerManagementDashboardGrid();
        renderMarketplaceProductsDisplayLoop();
        renderAdminDashboardMetricsCounters();
    } else {
        showTopRightToast("Error mapping product tracking instance registry.", "error");
    }
}

/**
 * Purges a product listing completely using ONLY local SYSTEM_DATABASE memory.
 * Requires user password confirmation directly inside the overlay modal prompt.
 */
function executeDeletePlatformInventoryItemListingPostRecord(targetProductIdKeyValueString) {
    const confirmationPromptMessage = "Are you sure you want to delete this product?";
    
    displayConfirmationModalOverlayAction(confirmationPromptMessage, () => {
        // Splice and remove from local application memory arrays safely
        const structuralIndexMatchPointerId = SYSTEM_DATABASE.products.findIndex(p => p.pid === targetProductIdKeyValueString);
        
        if (structuralIndexMatchPointerId !== -1) {
            SYSTEM_DATABASE.products.splice(structuralIndexMatchPointerId, 1);
            
            // Update dashboard product counter (-1)
            if (typeof updateAdminDashboardMetricCount === "function") {
                updateAdminDashboardMetricCount("lbl-metric-total-products-count", -1, "Products");
            }
            if (typeof renderAdminDashboardMetricsCounters === "function") {
                renderAdminDashboardMetricsCounters();
            }

            // Sync mutated array down to local persistent web storage
            syncPlatformDatabaseStateToWebStorage();

            // REPLACED ALERT: Custom animated success toast
            showTopRightToast("Product successfully purged from system inventory storage registers.", "success");
            
            // Trigger user interface lifecycle rendering view loops to instantly refresh screens
            if (typeof renderAccountInventoryLedgerManagementDashboardGrid === "function") {
                renderAccountInventoryLedgerManagementDashboardGrid();
            }
            if (typeof renderMarketplaceProductsDisplayLoop === "function") {
                renderMarketplaceProductsDisplayLoop();
            }
            renderAdminDashboardMetricsCounters();
        } else {
            // REPLACED ALERT: Custom animated error toast
            showTopRightToast("Error: Target product identifier mapping reference could not be found.", "error");
        }
    });
}

/**
 * Displays a custom animated toast notification from top-right.
 * @param {string} message - Text content of the alert.
 * @param {'success'|'error'|'info'} type - Theme flavor (default: 'success').
 * @param {number} durationMs - Display duration before sliding out (default: 3500ms).
 */
function showTopRightToast(message, type = 'success', durationMs = 3500) {
    // 1. Ensure the global container exists on the DOM
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Add text message + manual close button
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    // 3. Trigger entry animation in next animation frame
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Helper for graceful exit removal
    const dismissToast = () => {
        toast.classList.remove('toast-show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        }, { once: true });
    };

    // Manual close trigger on button click
    toast.querySelector('.toast-close-btn').addEventListener('click', dismissToast);

    // Auto dismiss timer
    if (durationMs > 0) {
        setTimeout(dismissToast, durationMs);
    }
}

// Global state object for managing account upgrades
let BUSINESS_UPGRADE_WIZARD = {
    otpCode: null,
    cooldownInterval: null,
    cooldownSeconds: 0
};

/**
 * Step 1: Initiate Account Upgrade Workflow - Password Verification Modal
 */
function initiateBusinessAccountUpgradeSequence() {
    if (!APP_STATE.currentUser) {
        showTopRightToast("Please log in to upgrade your account.", "info");
        return;
    }

    const currentAccountType = APP_STATE.currentUser.accountType || APP_STATE.currentUser.type || 'personal';
    if (currentAccountType === 'business') {
        showTopRightToast("Your account is already registered as a Business Account.", "info");
        return;
    }

    // Reuse existing confirm modal or build password verification modal inline
    let pwdModal = document.getElementById("upgrade-password-modal");
    if (pwdModal) pwdModal.remove();

    pwdModal = document.createElement("div");
    pwdModal.id = "upgrade-password-modal";
    pwdModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;";

    pwdModal.innerHTML = `
        <div style="background: white; border-radius: 8px; max-width: 400px; width: 90%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
            <h3 style="margin-top:0; color:var(--fort-blue-dark, #0d233a);">Confirm Password</h3>
            <p style="font-size:0.88rem; color:#555; margin-bottom:16px;">Verify your account credentials before upgrading your account to a Business Account (₦2,500 fee):</p>
            
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:0.8rem; margin-bottom:4px; font-weight:600;">Account Password</label>
                <input type="password" id="upgrade-pwd-input" class="form-field-control" placeholder="Enter your password" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                <div id="upgrade-pwd-error" style="color:red; font-size:0.8rem; margin-top:4px; display:none;"></div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn-gray" style="padding:8px 16px; border:none; border-radius:4px; cursor:pointer;" onclick="document.getElementById('upgrade-password-modal').remove()">Cancel</button>
                <button class="btn-blue" style="background:#09a5db; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="validateUpgradePasswordAndProceed()">Verify Password</button>
            </div>
        </div>
    `;

    document.body.appendChild(pwdModal);
}

/**
 * Validates password input against APP_STATE user records.
 */
function validateUpgradePasswordAndProceed() {
    const pwdInput = document.getElementById("upgrade-pwd-input");
    const errFeedback = document.getElementById("upgrade-pwd-error");
    const enteredPassword = pwdInput ? pwdInput.value.trim() : "";

    const actualSecret = APP_STATE.currentUser.secretKey || APP_STATE.currentUser.password || "";

    if (!enteredPassword || enteredPassword !== actualSecret) {
        if (errFeedback) {
            errFeedback.innerText = "Invalid password. Please check your password and try again.";
            errFeedback.style.display = "block";
        }
        return;
    }

    // Close password modal
    document.getElementById("upgrade-password-modal").remove();

    // Trigger Step 2: Send OTP and launch OTP Modal
    sendBusinessUpgradeEmailOtpWorkflow(true);
}

/**
 * Step 2: OTP Generation & EmailJS Sending Logic (Fixed)
 */
async function sendBusinessUpgradeEmailOtpWorkflow(isInitialLaunch = false) {
    const userObj = (typeof APP_STATE !== 'undefined' && APP_STATE.currentUser) ? APP_STATE.currentUser : {};
    
    // Fallback email retrieval
    const targetEmail = userObj.identifierText || userObj.email || "";
    
    if (!targetEmail || !targetEmail.includes("@")) {
        const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "No valid email associated with this account.";
            feedbackElement.style.color = "red";
            feedbackElement.style.display = "block";
        } else {
            alert("No valid email address found for this account.");
        }
        return;
    }

    const todayKeyStr = "otp_limit_" + new Date().toISOString().split('T')[0] + "_" + targetEmail.toLowerCase();
    
    let dailyAttemptsCount = parseInt(localStorage.getItem(todayKeyStr) || "0", 10);
    if (dailyAttemptsCount >= 5) {
        if (!isInitialLaunch) {
            const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
            if (feedbackElement) {
                feedbackElement.innerText = "Maximum daily limit reached (5 OTPs per day).";
                feedbackElement.style.color = "red";
                feedbackElement.style.display = "block";
            }
        } else {
            renderBusinessUpgradeOtpModal();
            setTimeout(() => {
                const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
                if (feedbackElement) {
                    feedbackElement.innerText = "Maximum daily limit reached (5 OTPs per day).";
                    feedbackElement.style.color = "red";
                    feedbackElement.style.display = "block";
                }
            }, 50);
        }
        return;
    }

    // Generate 4-digit code
    const freshOtpCode = Math.floor(1000 + Math.random() * 9000);
    BUSINESS_UPGRADE_WIZARD.otpCode = freshOtpCode;

    if (!isInitialLaunch) {
        const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Sending fresh code...";
            feedbackElement.style.color = "blue";
            feedbackElement.style.display = "block";
        }
    } else {
        renderBusinessUpgradeOtpModal();
    }

    // Check if EmailJS SDK is attached to window
    if (!window.emailjs) {
        console.error("EmailJS SDK not loaded on window.");
        const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Email service unavailable. Please refresh and try again.";
            feedbackElement.style.color = "red";
            feedbackElement.style.display = "block";
        }
        return;
    }

    try {
        // Start resend cooldown only when send is attempted
        initiateUpgradeOtpResendCooldown();

        const templateParams = {
            to_email: targetEmail,
            email: targetEmail, // Fallback alias
            user_name: userObj.identityName || userObj.username || "Valued Customer",
            to_name: userObj.identityName || userObj.username || "Valued Customer", // Fallback alias
            otp_code: freshOtpCode,
            code: freshOtpCode // Fallback alias
        };

        // Send via EmailJS
        const response = await window.emailjs.send(
            "service_ejag5pe", 
            "template_nzub7tk", 
            templateParams
        );

        console.log("EmailJS Success:", response.status, response.text);

        // Increment attempts count only after successful API call
        dailyAttemptsCount++;
        localStorage.setItem(todayKeyStr, dailyAttemptsCount.toString());

        const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = `Verification code sent to ${targetEmail}`;
            feedbackElement.style.color = "green";
            feedbackElement.style.display = "block";
        }
    } catch (sendErr) {
        console.error("EmailJS dispatch failed:", sendErr);
        const feedbackElement = document.getElementById("err-upgrade-otp-feedback");
        if (feedbackElement) {
            feedbackElement.innerText = "Failed to send code. Verify connection or email setup.";
            feedbackElement.style.color = "red";
            feedbackElement.style.display = "block";
        }
    }
}

/**
 * Handles 30-second resend timer cooldown for Upgrade OTP
 */
function initiateUpgradeOtpResendCooldown() {
    if (BUSINESS_UPGRADE_WIZARD.cooldownInterval) {
        clearInterval(BUSINESS_UPGRADE_WIZARD.cooldownInterval);
    }

    BUSINESS_UPGRADE_WIZARD.cooldownSeconds = 30;

    BUSINESS_UPGRADE_WIZARD.cooldownInterval = setInterval(() => {
        BUSINESS_UPGRADE_WIZARD.cooldownSeconds--;
        
        const resendLinkNode = document.getElementById("upgrade-otp-resend-link");
        if (resendLinkNode) {
            if (BUSINESS_UPGRADE_WIZARD.cooldownSeconds > 0) {
                resendLinkNode.innerText = `Resend in ${BUSINESS_UPGRADE_WIZARD.cooldownSeconds}s`;
                resendLinkNode.style.opacity = "0.5";
                resendLinkNode.style.fontWeight = "400";
                resendLinkNode.style.pointerEvents = "none";
            } else {
                resendLinkNode.innerText = "Resend";
                resendLinkNode.style.opacity = "1";
                resendLinkNode.style.fontWeight = "600";
                resendLinkNode.style.pointerEvents = "auto";
                clearInterval(BUSINESS_UPGRADE_WIZARD.cooldownInterval);
                BUSINESS_UPGRADE_WIZARD.cooldownInterval = null;
            }
        } else if (BUSINESS_UPGRADE_WIZARD.cooldownSeconds <= 0) {
            clearInterval(BUSINESS_UPGRADE_WIZARD.cooldownInterval);
            BUSINESS_UPGRADE_WIZARD.cooldownInterval = null;
        }
    }, 1000);
}

/**
 * Renders Step 2 Modal UI for OTP Input
 */
function renderBusinessUpgradeOtpModal() {
    let otpModal = document.getElementById("upgrade-otp-modal");
    if (otpModal) otpModal.remove();

    const maskedTargetEmail = APP_STATE.currentUser.identifierText || "user@fortmart.com";
    const secondsLeft = BUSINESS_UPGRADE_WIZARD.cooldownSeconds || 0;
    const textLabel = secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend";
    const opacityStyle = secondsLeft > 0 ? "0.5" : "1";
    const weightStyle = secondsLeft > 0 ? "400" : "600";
    const pointerEventsStyle = secondsLeft > 0 ? "none" : "auto";

    otpModal = document.createElement("div");
    otpModal.id = "upgrade-otp-modal";
    otpModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;";

    otpModal.innerHTML = `
        <div style="background: white; border-radius: 8px; max-width: 420px; width: 90%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
            <h3 style="margin-top:0; color:var(--fort-blue-dark, #0d233a);">Verify Email Identity</h3>
            <p style="font-size:0.92rem; color:var(--fort-blue-dark); line-height: 1.5; margin-top:12px; font-weight: 500;">
                Enter the OTP sent to <strong>${maskedTargetEmail}</strong>
            </p>
            
            <div style="margin-top:15px;">
                <label style="display:block; font-size:0.8rem; margin-bottom:4px; font-weight:600;">Input 4-Digit OTP Code:</label>
                <input type="text" id="upgrade-otp-input" class="form-field-control" placeholder="X X X X" maxlength="4" style="text-align:center; font-size:1.25rem; letter-spacing:8px; width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                <div id="err-upgrade-otp-feedback" style="color: red; font-size: 0.8rem; margin-top: 4px; display:none;"></div>
            </div>

            <div style="margin-top: 10px; font-size: 0.85rem;">
                <span>Didn't receive message? </span>
                <a href="javascript:void(0)" 
                   id="upgrade-otp-resend-link"
                   onclick="if(BUSINESS_UPGRADE_WIZARD.cooldownSeconds <= 0) sendBusinessUpgradeEmailOtpWorkflow(false);" 
                   style="color: #007bff; font-weight: ${weightStyle}; opacity: ${opacityStyle}; pointer-events: ${pointerEventsStyle}; text-decoration: none;">${textLabel}</a>
            </div>

            <p style="font-size:0.85rem; color:#666; line-height: 1.4; margin-top:12px;">
                Note: Check your spam folder if the code isn't in your primary inbox and tagged the message "not spam".
            </p>
            
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 20px;">
                <button class="btn-gray" style="padding:8px 16px; border:none; border-radius:4px; cursor:pointer;" onclick="closeUpgradeOtpModal()">Cancel</button>
                <button class="btn-blue" style="background:#09a5db; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:600; cursor:pointer;" onclick="executeVerifyUpgradeOtpSubmission()">Verify OTP</button>
            </div>
        </div>
    `;

    document.body.appendChild(otpModal);
}

function closeUpgradeOtpModal() {
    if (BUSINESS_UPGRADE_WIZARD.cooldownInterval) {
        clearInterval(BUSINESS_UPGRADE_WIZARD.cooldownInterval);
        BUSINESS_UPGRADE_WIZARD.cooldownInterval = null;
    }
    const modal = document.getElementById("upgrade-otp-modal");
    if (modal) modal.remove();
}

/**
 * Validates typed OTP input against BUSINESS_UPGRADE_WIZARD.otpCode
 */
function executeVerifyUpgradeOtpSubmission() {
    const inputField = document.getElementById("upgrade-otp-input");
    const feedback = document.getElementById("err-upgrade-otp-feedback");

    const enteredOtp = inputField ? inputField.value.trim() : "";
    const expectedOtp = String(BUSINESS_UPGRADE_WIZARD.otpCode || "");

    if (!enteredOtp || enteredOtp !== expectedOtp) {
        if (feedback) {
            feedback.innerText = "Invalid verification token. Please verify entry values.";
            feedback.style.color = "red";
            feedback.style.display = "block";
        }
        return;
    }

    // Clear timers and close modal
    closeUpgradeOtpModal();

    // Trigger Step 3: Launch Fort Mart Final Paystack Confirmation Modal
    launchBusinessUpgradePaystackConfirmationModal();
}

/**
 * Step 3: Final Fort Mart Confirmation Modal prior to Paystack Checkout launch
 */
function launchBusinessUpgradePaystackConfirmationModal() {
    let checkoutModal = document.getElementById("upgrade-paystack-checkout-modal");
    if (checkoutModal) checkoutModal.remove();

    checkoutModal = document.createElement("div");
    checkoutModal.id = "upgrade-paystack-checkout-modal";
    checkoutModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;";

    const userEmail = APP_STATE.currentUser.identifierText || 'user@fortmart.com';
    const upgradePrice = 2500; // 2,500 Naira

    checkoutModal.innerHTML = `
        <div class="paystack-modal-box" style="background: white; border-radius: 8px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid var(--fort-gray-border, #ccc);">
            <div class="paystack-header-brand" style="background-color: #09a5db; color: white; padding: 20px; text-align: center;">
                <h3 style="margin:0; color:white;">Fort Mart Gateway</h3>
                <span style="font-size:0.75rem; opacity:0.9;">Account Plan Upgrade to Business Account</span>
            </div>
            <div class="paystack-body-content" style="padding: 24px;">
                <p style="font-size:0.85rem; color:var(--fort-blue-dark, #0d233a); margin-bottom:12px;">You are authorizing a one-time payment to upgrade your account to a <strong>Business (Commercial) Account</strong>.</p>
                <div class="form-input-container" style="margin-bottom:10px;">
                    <label style="display:block; font-size:0.8rem; margin-bottom:4px;">Email Address</label>
                    <input type="text" id="upgrade-paystack-email-field" class="form-field-control" value="${userEmail}" disabled style="width:100%; padding:8px; box-sizing:border-box;">
                </div>
                <div class="form-input-container" style="margin-bottom:14px;">
                    <label style="display:block; font-size:0.8rem; margin-bottom:4px;">Fee Amount</label>
                    <input type="text" class="form-field-control" value="₦${upgradePrice.toLocaleString()}" disabled style="width:100%; padding:8px; box-sizing:border-box;">
                </div>
            </div>
            <div class="paystack-footer-row" style="padding: 16px 24px; background: #f9f9f9; border-top: 1px solid #eee; display: flex; justify-content: space-between;">
                <button class="btn-gray" style="padding:8px 16px; border:none; border-radius:4px; cursor:pointer;" onclick="document.getElementById('upgrade-paystack-checkout-modal').remove()">Cancel</button>
                <button class="btn-blue" style="background-color:#3bb75e; color:white; border:none; padding:8px 16px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="executeBusinessUpgradePaystackIframePopRuntime()">Proceed to Payment Method</button>
            </div>
        </div>
    `;

    document.body.appendChild(checkoutModal);
}

/**
 * Step 4: Paystack Runtime Initialization Execution
 */
function executeBusinessUpgradePaystackIframePopRuntime() {
    if (typeof PaystackPop === 'undefined') {
        showTopRightToast("Paystack SDK not loaded! Check your internet connection.", "info");
        return;
    }

    const emailField = document.getElementById("upgrade-paystack-email-field");
    const userEmail = emailField ? emailField.value : APP_STATE.currentUser.identifierText;

    const userUid = APP_STATE.currentUser ? APP_STATE.currentUser.uid : 'GUEST_USER';
    const upgradePrice = 2500; // 2500 NGN

    // Close preview modal
    const modal = document.getElementById('upgrade-paystack-checkout-modal');
    if (modal) modal.remove();

    let paymentConfig = {
        key: 'pk_test_8e350f62114983f1cd23b0944668d435a6e74214',
        email: userEmail,
        amount: upgradePrice * 100, // Amount in kobo (250,000 kobo = 2,500 NGN)
        currency: "NGN",
        ref: 'FT-BUS-UPGRADE-' + userUid + '-' + Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
            upgrade_type: "business_account",
            user_uid: userUid
        },
        callback: function(response) {
            console.log("Business Upgrade Payment successful response:", response);
            processBusinessUpgradePaymentSuccess();
        },
        onClose: function() {
            showTopRightToast('Payment window closed by customer session.', "info");
        }
    };

    try {
        let handler = PaystackPop.setup(paymentConfig);
        handler.openIframe();
    } catch (error) {
        console.error("Paystack Execution Error:", error);
        showTopRightToast("Error launching Paystack modal: " + error.message, "error");
    }
}

/**
 * Step 5: Post-Payment Business Account Transition and Admin Notification
 */
function processBusinessUpgradePaymentSuccess() {
    const userUid = APP_STATE.currentUser.uid || APP_STATE.currentUser.id;

    // 1. Update matching user record in SYSTEM_DATABASE.users
    const targetUserRecord = SYSTEM_DATABASE.users.find(u => u.uid === userUid || u.id === userUid);
    if (targetUserRecord) {
        targetUserRecord.accountType = 'business';
        targetUserRecord.type = 'business';

        if (!targetUserRecord.businessName) {
            targetUserRecord.businessName = targetUserRecord.identityName || targetUserRecord.username || "Corporate Entity";
        }
        if (!targetUserRecord.businessInfo) {
            targetUserRecord.businessInfo = "Commercial business distribution account profile workspace.";
        }
    }

    // 2. Synchronize current active runtime state
    APP_STATE.currentUser.accountType = 'business';
    APP_STATE.currentUser.type = 'business';
    if (!APP_STATE.currentUser.businessName) {
        APP_STATE.currentUser.businessName = APP_STATE.currentUser.identityName || APP_STATE.currentUser.username || "Corporate Entity";
    }
    if (!APP_STATE.currentUser.businessInfo) {
        APP_STATE.currentUser.businessInfo = "Commercial business distribution account profile workspace.";
    }

    // 3. Automated Message sent by Fort Mart Admin to User
    const adminMessageText = "Congratulations! Your account has been successfully upgraded to a Business Account. You now have full access to business features on Fort Mart.";
    const targetChatId = "chat_admin_" + userUid;

    let adminChatThread = SYSTEM_DATABASE.chats.find(c => c.chatId === targetChatId);

    if (adminChatThread) {
        adminChatThread.messageLog.push({
            mid: "msg_" + Date.now(),
            senderUid: "admin",
            text: adminMessageText,
            timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        });
    } else {
        // Create chat thread if non-existent
        adminChatThread = {
            chatId: targetChatId,
            dynamicParticipants: ["admin", userUid],
            messageLog: [
                {
                    mid: "msg_" + Date.now(),
                    senderUid: "admin",
                    text: adminMessageText,
                    timestamp: new Date().toLocaleTimeString([], { day: '2-digit',  month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
                }
            ]
        };
        SYSTEM_DATABASE.chats.push(adminChatThread);
    }

    // 4. Commit and sync modifications to local web storage
    if (typeof syncPlatformDatabaseStateToWebStorage === "function") {
        syncPlatformDatabaseStateToWebStorage();
    } else if (typeof commitDatabasesStateToLocalStorage === "function") {
        commitDatabasesStateToLocalStorage();
    }

    showTopRightToast("Payment successful! Your account has been upgraded to a Business Account.", "success");

    // Refresh UI/view rendering if applicable
    if (typeof renderMarketplaceProductsDisplayLoop === "function") {
        renderMarketplaceProductsDisplayLoop();
    }
}

function launchadvertismentofBusinessUpgrade() {
    const modalContentTargetNode = document.getElementById("auth-modal-content");
    modalContentTargetNode.innerHTML = `
        <h3>Upgrade Account To Business To Publish Products</h3>
    
        <div style="margin-top: 14px; padding: 12px; background: #eef9ff; border: 1px solid #bbeeef; border-radius: 6px; text-align: center;">
            <p style="font-size: 0.85rem; color: #0d233a; margin-bottom: 8px;">
                Want to list products and unlock commercial tools?
            </p>
            <button class="btn-blue" style="background-color: #09a5db; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 700; cursor: pointer;" onclick="closeActiveModalDirectly('auth-modal'); initiateBusinessAccountUpgradeSequence()">
                Upgrade Account to Business (₦2,500)
            </button>
        </div>        
        <div class="btn-group">
            <button onclick="closeActiveModalDirectly('auth-modal')" class="btn-gray">Close</button> 
        </div>
    `;
    document.getElementById("auth-modal").classList.add("active"); 
}

/**
 * Admin User List Rendering Engine
 * Filters and displays accounts sorted by creation date (newest first).
 */
function renderAdminUsersManagementList() {
    const listContainer = document.getElementById("admin-users-list-container");
    const searchInput = document.getElementById("admin-user-search-bar");
    if (!listContainer) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    // 1. Filter out admin self-account and apply search query matching
    let filteredUsers = SYSTEM_DATABASE.users.filter(u => {
        if (u.uid === 'admin' || u.id === 'admin') return false;
        
        const nameMatch = (u.identityName || u.username || '').toLowerCase().includes(searchTerm);
        const emailMatch = (u.identifierText || '').toLowerCase().includes(searchTerm);
        const statusMatch = (u.verificationStatus || u.status || '').toLowerCase().includes(searchTerm);
        const typeMatch = (u.accountType || u.type || '').toLowerCase().includes(searchTerm);
        
        return nameMatch || emailMatch || statusMatch || typeMatch;
    });

    // 2. Sort accounts from most recently created to least recently created
    filteredUsers.sort((a, b) => {
        const timeA = parseInt(String(a.uid || a.id).replace('user_', ''), 10) || 0;
        const timeB = parseInt(String(b.uid || b.id).replace('user_', ''), 10) || 0;
        return timeB - timeA;
    });

    // 3. Render account listing DOM nodes
    if (filteredUsers.length === 0) {
        listContainer.innerHTML = `<div style="padding:12px; color:var(--fort-gray-slate); text-align:center; font-style:italic;">No user accounts found matching criteria.</div>`;
        return;
    }

    let listHTML = "";
    filteredUsers.forEach(user => {
        const userId = user.uid || user.id;
        const displayName = user.identityName || user.username || "Unnamed User";
        const email = user.identifierText || "No Contact";
        const accountType = user.accountType || user.type || "personal";
        const status = user.verificationStatus || user.status || "unverified";
        const avatar = user.avatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

        const isVerified = status === "verified";
        const badgeBg = isVerified ? "#e6fffa" : "#fff5f5";
        const badgeColor = isVerified ? "#234e52" : "#9b2c2c";
        const badgeBorder = isVerified ? "#b2f5ea" : "#feb2b2";

        listHTML += `
            <div class="admin-user-card-item" onclick="launchDetailedUserProfileContextOverlaySummaryModal('${userId}')" style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.borderColor='#cbd5e0'; this.style.background='#f8fafc';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#fff';">
                <img src="${avatar}" style="width:42px; height:42px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e0;" alt="Avatar">
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h4 style="margin:0; font-size:0.92rem; color:var(--fort-blue-dark); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${displayName}</h4>
                        <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder};">${status}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--fort-gray-slate); margin-top:2px;">
                        Email: <strong>${email}</strong> | Type: <span style="text-transform:capitalize;">${accountType}</span>
                    </div>
                </div>
                <button class="btn-blue" style="padding:4px 10px; font-size:0.75rem;" onclick="event.stopPropagation(); launchDetailedUserProfileContextOverlaySummaryModal('${userId}')">Manage</button>
            </div>
        `;
    });

    listContainer.innerHTML = listHTML;
}

const ad1 = {
    type: 'image',
    header: 'Need a Custom Website!',
    text: 'Try Fort Developers <br> (createawebsite.fortdevelopers.com.ng)',
    src: 'flyer-fort-2_ewnab_landscape.png',
    url: 'createawebsite.fortdevelopers.com.ng'
};

const ad2 = {
    type: 'image',
    header: 'Need a Custom Website!',
    text: 'Try Fort Developers <br> (ccreateawebsite.fortdevelopers.com.ng)',
    src: 'flyer-fort-landscape.png',
    url: 'https://createawebsite.fortdevelopers.com.ng'
};

const ads = [ad1, ad2];

function setupAdModal() {
    // Retrieve previous index from localStorage, or default to -1 if not set
    let lastIndex = parseInt(localStorage.getItem('lastAdIndex'), 10);
    if (isNaN(lastIndex)) {
        lastIndex = -1;
    }

    // Calculate next index in sequence (loops back to 0 when end is reached)
    const nextIndex = (lastIndex + 1) % ads.length;
    
    // Save current index for the next run
    localStorage.setItem('lastAdIndex', nextIndex);

    const currentAd = ads[nextIndex];

    const headerEl = document.getElementById('ad-header');
    const textEl = document.getElementById('ad-text');
    const mediaContainer = document.getElementById('ad-media-container');
    const continueBtn = document.getElementById('ad-continue-btn');
    const visitBtn = document.getElementById('ad-visit-btn');

    // Populate header, text, and visit button
    headerEl.innerText = currentAd.header;
    textEl.innerHTML = `<strong>${currentAd.text}</strong>`;
    
    if (visitBtn) {
        visitBtn.href = currentAd.url;
    }

    mediaContainer.innerHTML = '';
    
    // Open URL when clicking the container (opens in new tab)
    mediaContainer.style.cursor = 'pointer';
    mediaContainer.onclick = (e) => {
        // Prevent triggering redirect if the user interacts with video controls
        if (e.target.tagName !== 'VIDEO') {
            window.open(currentAd.url, '_blank', 'noopener,noreferrer');
        }
    };

    // Render appropriate media element
    if (currentAd.type === 'video') {
        const video = document.createElement('video');
        video.src = currentAd.src;
        video.autoplay = true;
        video.muted = true; // Required for reliable autoplay across browsers
        video.playsInline = true;
        video.controls = true;
        
        // Open URL when clicking video background without triggering play/pause controls conflict
        video.addEventListener('click', (e) => {
            // If controls area isn't being clicked directly
            e.stopPropagation();
            window.open(currentAd.url, '_blank', 'noopener,noreferrer');
        });

        mediaContainer.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = currentAd.src;
        img.alt = currentAd.header;
        mediaContainer.appendChild(img);
    }

    // Enforce 7-second timer for ALL ad types
    continueBtn.disabled = true;
    let countdown = 7;
    continueBtn.innerText = `Continue in ${countdown}s`;

    const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            continueBtn.innerText = `Continue in ${countdown}s`;
        } else {
            clearInterval(timer);
            continueBtn.disabled = false;
            continueBtn.innerText = 'Continue';
        }
    }, 1000);
}

function closeActiveModalDirectlyAd(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', setupAdModal);


/**
 * Synchronizes admin dashboard counts directly from active system database state.
 */
function renderAdminDashboardMetricsCounters() {
    const userCountNode = document.getElementById("lbl-metric-total-users-count");
    const productCountNode = document.getElementById("lbl-metric-total-products-count");

    // Ensure database exists
    if (typeof SYSTEM_DATABASE === 'undefined') {
        window.SYSTEM_DATABASE = { users: [], products: [], chats: [] };
    }

    const totalUsers = Array.isArray(SYSTEM_DATABASE.users) ? SYSTEM_DATABASE.users.length : 0;
    const totalProducts = Array.isArray(SYSTEM_DATABASE.products) ? SYSTEM_DATABASE.products.length : 0;

    if (userCountNode) {
        userCountNode.innerText = `${totalUsers} Users`;
    }

    if (productCountNode) {
        productCountNode.innerText = `${totalProducts} Products`;
    }
}

/**
 * Directly modifies an active metric counter DOM element by an incremental delta.
 * @param {string} elementId - Target DOM ID (e.g. 'lbl-metric-total-products-count')
 * @param {number} deltaValue - Amount to change (+1 or -1)
 * @param {string} labelSuffix - Suffix text ('Products' or 'Users')
 */
function updateAdminDashboardMetricCount(elementId, deltaValue, labelSuffix) {
    const targetNode = document.getElementById(elementId);
    if (!targetNode) return;

    // Parse the leading integer out of the text (e.g., "5 Products" -> 5)
    let currentVal = parseInt(targetNode.innerText.replace(/\D/g, ''), 10);
    if (isNaN(currentVal)) currentVal = 0;

    const newVal = Math.max(0, currentVal + deltaValue);
    targetNode.innerText = `${newVal} ${labelSuffix}`;
}


window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('uid') || urlParams.get('user');

    if (userId) {
        // Pass false so it loads the profile without attempting to rewrite history
        launchDetailedUserProfileContextOverlaySummaryModal(userId, false);
    }
});

function handleInitialUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('uid') || urlParams.get('user');
    const productId = urlParams.get('pid');

    if (productId) {
        launchComprehensiveProductSpecificationsExpandedModalView(productId, false);
    } else if (userId) {
        // Pass 'false' for pushToHistory so it doesn't overwrite the existing URL
        launchDetailedUserProfileContextOverlaySummaryModal(userId, false);
    }
}

// Attach listener
window.addEventListener('DOMContentLoaded', handleInitialUrlRouting);


// JavaScript

// Database of related sub-prompts mapped by category or keywords
const subPromptPresets = {
    'Marketing': [
        "Generate email copy for this campaign",
        "What are key performance metrics to track?",
        "Create a 7-day social media schedule"
    ],
    'Development': [
        "Add error handling to this solution",
        "How do I write unit tests for this?",
        "Explain the time complexity (Big O)"
    ],
    'UI/UX': [
        "How do I make this responsive on mobile?",
        "Suggest a color palette for this dashboard",
        "Add a dark mode CSS override"
    ],
    'General': [
        "Can you elaborate on that?",
        "Give me a bulleted summary",
        "Provide a concrete example"
    ]
};

// Main function to trigger when opening or entering the Prompt Page
function initPromptWorkspacePage() {
    const pageEl = document.getElementById('page-prompt-workspace-aipage');
    if (pageEl) {
        pageEl.classList.remove('hidden-view-aipage');
    }
    // Ensure state opens clean on default search view
    closePromptChatOverlay();
}

function submitMainPrompt() {
    const input = document.getElementById('main-prompt-input-aipage');
    const promptText = input.value.trim();
    if (!promptText) return;
    
    launchPromptChatOverlay("Custom Search", promptText, 'General');
    input.value = '';
}

function triggerPresetPrompt(category, text) {
    launchPromptChatOverlay(category, text, category);
}

function launchPromptChatOverlay(title, initialPromptText, category) {
    document.getElementById('active-prompt-title-aipage').innerText = title;
    document.getElementById('active-prompt-category-aipage').innerText = category;
    
    const stream = document.getElementById('prompt-chat-stream-aipage');
    stream.innerHTML = ''; // Clear prior chat history
    
    // Reveal overlay
    document.getElementById('prompt-chat-overlay-aipage').classList.remove('hidden-node-aipage');
    
    // Inject initial prompt & generate response
    appendMessage(initialPromptText, 'user-aipage');
    renderSubPrompts(category);
    
    // Simulated system response
    setTimeout(() => {
        appendMessage(`Here is the solution regarding "${initialPromptText}". You can use the suggested sub-prompts below to refine this output.`, 'system-aipage');
    }, 600);
}

function sendOverlayFollowUp(customText = null) {
    const input = document.getElementById('overlay-chat-input-aipage');
    const text = customText || input.value.trim();
    if (!text) return;

    appendMessage(text, 'user-aipage');
    if (!customText) input.value = '';

    // Simulated reply
    setTimeout(() => {
        appendMessage(`Processed follow-up request: "${text}".`, 'system-aipage');
    }, 600);
}

function appendMessage(text, senderClass) {
    const stream = document.getElementById('prompt-chat-stream-aipage');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg-aipage ${senderClass}`;
    msgDiv.innerText = text;
    stream.appendChild(msgDiv);
    stream.scrollTop = stream.scrollHeight;
}

function renderSubPrompts(category) {
    const container = document.getElementById('sub-prompts-chip-container-aipage');
    container.innerHTML = '';
    
    const prompts = subPromptPresets[category] || subPromptPresets['General'];
    
    prompts.forEach(promptText => {
        const chip = document.createElement('button');
        chip.className = 'chip-btn-aipage';
        chip.innerText = promptText;
        chip.onclick = () => sendOverlayFollowUp(promptText);
        container.appendChild(chip);
    });
}

function closePromptChatOverlay() {
    document.getElementById('prompt-chat-overlay-aipage').classList.add('hidden-node-aipage');
}