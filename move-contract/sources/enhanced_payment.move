/// Enhanced Payment module for FacePay system
/// Provides high-level payment functions that properly integrate registry and payment logic
module facepay::enhanced_payment {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::signer;
    use std::error;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use facepay::registry::{Self, UserProfile};
    use facepay::facepay::{Self, FacePaySystem, PaymentTx};

    // ====== Error Codes ======
    const E_USER_NOT_FOUND: u64 = 1;
    const E_INVALID_FACE_HASH: u64 = 2;
    const E_SAME_SENDER_RECIPIENT: u64 = 3;
    const E_INSUFFICIENT_PAYMENT: u64 = 4;
    const E_SYSTEM_NOT_INITIALIZED: u64 = 5;
    const E_INSUFFICIENT_BALANCE: u64 = 6;

    // ====== Structs ======

    /// Enhanced payment configuration
    struct EnhancedPaymentConfig has key {
        /// System admin address
        system_admin: address,
        /// Registry admin address
        registry_admin: address,
        /// Events
        face_payment_completed_events: EventHandle<FacePaymentCompletedEvent>,
        face_verification_success_events: EventHandle<FaceVerificationSuccessEvent>,
    }

    // ====== Enhanced Payment Events ======

    /// Emitted when a face-based payment is successfully processed
    struct FacePaymentCompletedEvent has drop, store {
        payment_id: u64,
        sender: address,
        recipient_face_hash: String,
        recipient_address: address,
        preferred_token: address,
        amount_paid: u64,
        fee_amount: u64,
        timestamp: u64,
    }

    /// Emitted when face verification is successful
    struct FaceVerificationSuccessEvent has drop, store {
        face_hash: String,
        recipient_address: address,
        timestamp: u64,
    }

    // ====== Functions ======

    /// Initialize enhanced payment system
    public entry fun initialize(
        admin: &signer,
        system_admin: address,
        registry_admin: address,
    ) {
        let admin_addr = signer::address_of(admin);
        
        // Ensure only one enhanced payment system can be initialized
        assert!(!exists<EnhancedPaymentConfig>(admin_addr), error::already_exists(E_SYSTEM_NOT_INITIALIZED));
        
        // Create enhanced payment configuration
        let config = EnhancedPaymentConfig {
            system_admin,
            registry_admin,
            face_payment_completed_events: account::new_event_handle<FacePaymentCompletedEvent>(admin),
            face_verification_success_events: account::new_event_handle<FaceVerificationSuccessEvent>(admin),
        };
        
        // Store configuration
        move_to(admin, config);
    }

    /// Enhanced face-based payment that properly verifies user and processes payment
    /// This is the main function that the frontend should use for face payments
    public entry fun pay_by_face_enhanced(
        sender: &signer,
        recipient_face_hash: String,
        amount: u64,
        enhanced_admin: address,
    ) acquires EnhancedPaymentConfig {
        let sender_addr = signer::address_of(sender);
        let current_time = timestamp::now_seconds();

        // Get enhanced payment configuration
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global_mut<EnhancedPaymentConfig>(enhanced_admin);

        // Step 1: Verify the face hash exists and get recipient address
        let recipient_address_opt = registry::get_user_by_face_hash(config.registry_admin, recipient_face_hash);
        assert!(option::is_some(&recipient_address_opt), error::not_found(E_USER_NOT_FOUND));
        let recipient_address = option::extract(&mut recipient_address_opt);

        // Step 2: Verify user profile exists
        assert!(registry::user_profile_exists(recipient_address), error::not_found(E_USER_NOT_FOUND));

        // Step 3: Ensure sender is not paying themselves
        assert!(sender_addr != recipient_address, error::invalid_argument(E_SAME_SENDER_RECIPIENT));

        // Step 4: Check sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, error::insufficient_funds(E_INSUFFICIENT_BALANCE));

        // Step 5: Emit face verification success event
        event::emit_event(&mut config.face_verification_success_events, FaceVerificationSuccessEvent {
            face_hash: recipient_face_hash,
            recipient_address,
            timestamp: current_time,
        });

        // Step 6: Process payment through the facepay system
        facepay::pay_by_face_apt_with_profile(
            sender,
            recipient_face_hash,
            amount,
            config.system_admin,
        );

        // Step 7: Calculate fee for event (simplified calculation)
        let fee_amount = (amount * 30) / 10000; // 0.3% fee

        // Step 8: Get payment ID (simplified - in real implementation would get from facepay system)
        let payment_id = facepay::get_payment_counter(config.system_admin);

        // Step 9: Emit enhanced payment completion event
        event::emit_event(&mut config.face_payment_completed_events, FacePaymentCompletedEvent {
            payment_id,
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            preferred_token: @0x1, // APT - in real implementation would get from user profile
            amount_paid: amount,
            fee_amount,
            timestamp: current_time,
        });
    }

    /// Enhanced face-based payment with explicit user verification
    /// This version performs additional checks and provides more detailed verification
    public entry fun pay_by_face_enhanced_with_verification(
        sender: &signer,
        recipient_face_hash: String,
        amount: u64,
        enhanced_admin: address,
    ) acquires EnhancedPaymentConfig {
        let sender_addr = signer::address_of(sender);
        let current_time = timestamp::now_seconds();

        // Get enhanced payment configuration
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global_mut<EnhancedPaymentConfig>(enhanced_admin);

        // Step 1: Verify the face hash exists and get recipient address
        let recipient_address_opt = registry::get_user_by_face_hash(config.registry_admin, recipient_face_hash);
        assert!(option::is_some(&recipient_address_opt), error::not_found(E_USER_NOT_FOUND));
        let recipient_address = option::extract(&mut recipient_address_opt);

        // Step 2: Verify user profile exists and is properly registered
        assert!(registry::user_profile_exists(recipient_address), error::not_found(E_USER_NOT_FOUND));

        // Step 3: Double-check face hash correspondence
        assert!(registry::user_exists_by_face(config.registry_admin, recipient_face_hash), error::invalid_argument(E_INVALID_FACE_HASH));

        // Step 4: Ensure sender is not paying themselves
        assert!(sender_addr != recipient_address, error::invalid_argument(E_SAME_SENDER_RECIPIENT));

        // Step 5: Check sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, error::insufficient_funds(E_INSUFFICIENT_BALANCE));

        // Step 6: Emit face verification success event with additional verification
        event::emit_event(&mut config.face_verification_success_events, FaceVerificationSuccessEvent {
            face_hash: recipient_face_hash,
            recipient_address,
            timestamp: current_time,
        });

        // Step 7: Process payment through the facepay system
        facepay::pay_by_face_apt_with_profile(
            sender,
            recipient_face_hash,
            amount,
            config.system_admin,
        );

        // Step 8: Calculate fee for event
        let fee_amount = (amount * 30) / 10000; // 0.3% fee

        // Step 9: Get payment ID
        let payment_id = facepay::get_payment_counter(config.system_admin);

        // Step 10: Emit enhanced payment completion event
        event::emit_event(&mut config.face_payment_completed_events, FacePaymentCompletedEvent {
            payment_id,
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            preferred_token: @0x1, // APT
            amount_paid: amount,
            fee_amount,
            timestamp: current_time,
        });
    }

    /// Look up user by face hash and return their address
    /// This can be used by the frontend to verify recipients before payment
    public fun lookup_user_by_face(
        registry_admin: address,
        face_hash: String
    ): Option<address> {
        registry::get_user_by_face_hash(registry_admin, face_hash)
    }

    /// Check if a user exists in the registry by face hash
    public fun user_exists_by_face_hash(
        registry_admin: address,
        face_hash: String
    ): bool {
        registry::user_exists_by_face(registry_admin, face_hash)
    }

    /// Check if a user exists in the registry by address
    public fun user_exists_by_address(
        registry_admin: address,
        user_address: address
    ): bool {
        registry::user_exists_by_address(registry_admin, user_address)
    }

    /// Get comprehensive user verification status
    public fun get_user_verification_status(
        registry_admin: address,
        face_hash: String
    ): (bool, Option<address>) {
        let user_exists = registry::user_exists_by_face(registry_admin, face_hash);
        let user_address = registry::get_user_by_face_hash(registry_admin, face_hash);
        (user_exists, user_address)
    }

    /// Verify face hash and address correspondence
    public fun verify_face_hash_and_address(
        registry_admin: address,
        face_hash: String,
        expected_address: address
    ): bool {
        let user_address_opt = registry::get_user_by_face_hash(registry_admin, face_hash);
        if (option::is_some(&user_address_opt)) {
            let user_address = option::extract(&mut user_address_opt);
            user_address == expected_address
        } else {
            false
        }
    }

    /// Get system and registry admin addresses
    public fun get_admin_addresses(enhanced_admin: address): (address, address) acquires EnhancedPaymentConfig {
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global<EnhancedPaymentConfig>(enhanced_admin);
        (config.system_admin, config.registry_admin)
    }

    /// Check if enhanced payment system is initialized
    public fun is_enhanced_payment_initialized(enhanced_admin: address): bool {
        exists<EnhancedPaymentConfig>(enhanced_admin)
    }

    /// Get payment processing statistics
    public fun get_payment_statistics(enhanced_admin: address): (u64, u64, u64) acquires EnhancedPaymentConfig {
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global<EnhancedPaymentConfig>(enhanced_admin);
        
        // Get statistics from the main facepay system
        facepay::get_system_stats(config.system_admin)
    }

    /// Get registry statistics
    public fun get_registry_statistics(enhanced_admin: address): u64 acquires EnhancedPaymentConfig {
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global<EnhancedPaymentConfig>(enhanced_admin);
        
        // Get statistics from the registry
        registry::get_registry_stats(config.registry_admin)
    }

    // ====== Future Token Swap Integration ======

    /// Future function for payments with automatic token swapping
    /// This would integrate with Aptos DEX protocols for token conversion
    public entry fun pay_by_face_with_swap_enhanced(
        sender: &signer,
        recipient_face_hash: String,
        amount: u64,
        preferred_token_type: address,
        max_slippage_bps: u64,
        enhanced_admin: address,
    ) acquires EnhancedPaymentConfig {
        let sender_addr = signer::address_of(sender);
        
        // Get enhanced payment configuration
        assert!(exists<EnhancedPaymentConfig>(enhanced_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let config = borrow_global<EnhancedPaymentConfig>(enhanced_admin);

        // TODO: Implement DEX integration for automatic token swapping
        // This would:
        // 1. Verify face hash and get user preferences
        // 2. Check if token swap is needed (payment token != preferred token)
        // 3. Execute swap through Aptos DEX (PancakeSwap, LiquidSwap, etc.)
        // 4. Transfer swapped tokens to recipient
        // 5. Handle slippage and swap failures
        
        // For now, we'll just perform a regular APT payment
        pay_by_face_enhanced(sender, recipient_face_hash, amount, enhanced_admin);
    }

    #[test_only]
    public fun init_for_testing(
        admin: &signer,
        system_admin: address,
        registry_admin: address,
    ) {
        initialize(admin, system_admin, registry_admin);
    }
} 