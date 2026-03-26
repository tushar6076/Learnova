/**
 * LEARNOVA - Main Site Logic
 * Manages dynamic component injection and interactive site features.
 */

$(document).ready(function() {

    // Social Media Redirects
    $(document).on('click', '.social-btn', function(e) {
        e.preventDefault();
        const url = $(this).data('url');
        if (url) {
            window.open(url, '_blank');
        }
    });

    // Support Email Trigger
    $(document).on('click', '#email', function() {
        const emailAddress = $(this).data('email');
        const subject = encodeURIComponent("Learnova Support: General Inquiry");
        
        if (emailAddress) {
            window.location.href = `mailto:${emailAddress}?subject=${subject}`;
        }
    });

    // Digital Support Phone Hotline
    $(document).on('click', '#phone', function() {
        const phoneNumber = $(this).data('phone');
        if (phoneNumber) {
            window.location.href = `tel:${phoneNumber}`;
        }
    });


    // --- 3. UI ENHANCEMENTS ---
    // Log system status for debugging
    console.log("🚀 Learnova: main.js initialized successfully.");
});