/**
 * ------------------------------------------------------------------
 * 1. SUPABASE INITIALIZATION
 * ------------------------------------------------------------------
 */
const SUPABASE_URL = 'https://ihuhkwttcdtqhnyiqfbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Opj9kLRtDMLctX1rsOPngg_9wzVSILs';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper function to upload base64 or File objects to Supabase Storage bucket 'user-avatars'
 * and extract the generated public CDN URL path.
 */
async function uploadAvatarToSupabaseStorage(fileOrBase64, filenamePrefix = 'avatar') {
    if (!fileOrBase64) return "";
    
    // Convert base64 data URL to Blob if necessary
    let fileBody = fileOrBase64;
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
        const response = await fetch(fileOrBase64);
        fileBody = await response.blob();
    }
    
    const filePath = `avatars/${filenamePrefix}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('user-avatars')
        .upload(filePath, fileBody, {
            contentType: 'image/png',
            upsert: true
        });

    if (uploadError) {
        console.error("Supabase Storage Upload Error:", uploadError.message);
        return "";
    }

    const { data: publicUrlData } = supabase
        .storage
        .from('user-avatars')
        .getPublicUrl(filePath);

    return publicUrlData ? publicUrlData.publicUrl : "";
}

/**
 * ------------------------------------------------------------------
 * 2. SIGN-UP & AVATAR UPLOAD WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeFinalizeAccountRegistrationPipelineSubmission() {
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

    // Insert record asynchronously into Supabase 'users' table
    const { data: insertedUser, error: insertError } = await supabase
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

/**
 * ------------------------------------------------------------------
 * 3. SIGN-IN WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeAccountSignInAuthenticationRequest() {
    const countryRawValue = document.getElementById("auth-signin-country").value.split("|");
    const dialingCode = countryRawValue[1];
    const identifierInput = document.getElementById("auth-signin-identifier").value.trim();
    const passwordInput = document.getElementById("auth-signin-password").value;
    
    const errIdNode = document.getElementById("err-signin-identifier");
    const errPassNode = document.getElementById("err-signin-password");
    errIdNode.classList.add("hidden-node");
    errPassNode.classList.add("hidden-node");

    // Query user record directly from Supabase 'users' table
    const { data: dbUsers, error: queryError } = await supabase
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
 * ------------------------------------------------------------------
 * 5. PROFILE EDIT WIZARD WORKFLOW
 * ------------------------------------------------------------------
 */
async function executeSaveProfileWizardModificationsToDatabase(targetFieldNameStringTokenKey) {
    const val1 = document.getElementById("profile-new-value-1").value.trim();
    const errorNode = document.getElementById("err-profile-step3-feedback");
    errorNode.classList.add("hidden-node");
    
    if (!val1) {
        errorNode.innerText = "Field value cannot be blank.";
        errorNode.classList.remove("hidden-node");
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

    // Overwrite and update fields in the Supabase 'users' table for active user uid
    const { data: updatedRecord, error: updateError } = await supabase
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

/**
 * Handle new avatar image updates from profile edit wizard/settings
 */
async function updateProfileAvatar(fileOrBase64) {
    if (!APP_STATE.currentUser) return;
    
    // Upload image to user-avatars bucket and get public URL
    const publicUrl = await uploadAvatarToSupabaseStorage(fileOrBase64, APP_STATE.currentUser.uid);
    if (!publicUrl) return;

    // Update avatar column in Supabase database
    const { data: updatedRecord, error: updateError } = await supabase
        .from('users')
        .update({ avatar: publicUrl })
        .eq('uid', APP_STATE.currentUser.uid)
        .select()
        .single();

    if (!updateError && updatedRecord) {
        APP_STATE.currentUser.avatar = updatedRecord.avatar;
        initializeProfileDetailsAccountManagementFieldsValues();
        showTopRightToast("Avatar updated successfully", "success");
    }
}