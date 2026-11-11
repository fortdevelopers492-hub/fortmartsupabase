<?php
// Only accept POST requests from Paystack
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit();
}

// 1. Verify the signature to ensure it's genuinely from Paystack
define('PAYSTACK_SECRET_KEY', 'sk_test_befcb8fa4907f0c1047d735b3612efecb6aba5a9');
$input = file_get_contents('php://input');

if(!$_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] || ($_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] !== hash_hmac('sha512', $input, PAYSTACK_SECRET_KEY))) {
    exit(); // Silently fail if unauthorized
}

// 2. Parse the payment event data payload
$event = json_decode($input, true);

// 3. Handle successful automated recurring charge transactions
if ($event['event'] === 'charge.success') {
    $metadata = $event['data']['metadata'];
    
    // Extract the specific leaderboard slot index we passed during checkout
    $slotIndex = isset($metadata['slot_index']) ? intval($metadata['slot_index']) : null;
    $userUid = isset($metadata['user_uid']) ? $metadata['user_uid'] : null;

    if ($slotIndex !== null && $userUid !== null) {
        // 4. Load your database file logic (Assuming database is JSON or DB table)
        $dbPath = '../database.json'; // Adjust to your actual path
        $database = json_decode(file_get_contents($dbPath), true);
        
        // Calculate new expiration target date (30 Days out in milliseconds)
        $oneMonthInMs = 30 * 24 * 60 * 60 * 1000;
        $newExpiration = round(microtime(true) * 1000) + $oneMonthInMs;
        
        // Update slot records securely on the master database file
        $database['slotMetadata'][$slotIndex]['expirationTime'] = $newExpiration;
        $database['slotMetadata'][$slotIndex]['previousOwnerUid'] = $userUid;
        $database['slotMetadata'][$slotIndex]['autoRenew'] = true;
        
        // Inject an administrative notification confirmation alert record
        $database['adminMessages'][] = [
            'recipientUid' => $userUid,
            'sender' => 'Fort Mart Admin',
            'timestamp' => round(microtime(true) * 1000),
            'message' => "Auto-Renew Successful! Your subscription renewal for Leaderboard Slot Position #" . ($slotIndex + 1) . " was successfully processed."
        ];
        
        // Save updates to storage block
        file_put_contents($dbPath, json_encode($database, JSON_PRETTY_PRINT));
    }
}

// Always respond with HTTP 200 to let Paystack know you received the data successfully
http_response_code(200);
?>