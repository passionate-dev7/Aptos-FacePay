/// FacePay main module for face-based payments
/// Handles payment processing with automatic token swapping
module facepay::facepay {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use std::signer;
    use std::error;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_std::smart_table::{Self, SmartTable};
    use facepay::registry::{Self, UserProfile};

    // ====== Error Codes ======
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_PAYMENT: u64 = 2;
    const E_RECIPIENT_NOT_FOUND: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_SAME_SENDER_RECIPIENT: u64 = 5;
    const E_TOKEN_NOT_SUPPORTED: u64 = 6;
    const E_INVALID_SWAP_PARAMS: u64 = 7;
    const E_SWAP_FAILED: u64 = 8;
    const E_SYSTEM_NOT_INITIALIZED: u64 = 9;
    const E_INSUFFICIENT_BALANCE: u64 = 10;

    // ====== Constants ======
    const MIN_PAYMENT_AMOUNT: u64 = 1000000; // 0.01 APT in octas
    const MAX_SLIPPAGE_BPS: u64 = 5000; // 50% max slippage
    const DEFAULT_FEE_BPS: u64 = 30; // 0.3% fee

    // ====== Structs ======

    /// Main FacePay system configuration
    struct FacePaySystem has key {
        /// Registry of supported tokens
        supported_tokens: SmartTable<address, bool>,
        /// Minimum payment amounts per token
        min_amounts: SmartTable<address, u64>,
        /// Fee percentage in basis points (100 = 1%)
        fee_bps: u64,
        /// Total number of payments processed
        total_payments: u64,
        /// Total volume processed in APT
        total_volume: u64,
        /// Registry admin address
        registry_admin: address,
        /// Events
        payment_initiated_events: EventHandle<PaymentInitiatedEvent>,
        payment_completed_events: EventHandle<PaymentCompletedEvent>,
        payment_failed_events: EventHandle<PaymentFailedEvent>,
    }

    /// Admin capability for system management
    struct AdminCap has key {
        admin: address,
    }

    /// Payment transaction record
    struct PaymentTx has key {
        /// Sender's address
        sender: address,
        /// Recipient's face hash
        recipient_face_hash: String,
        /// Recipient's Aptos address
        recipient_address: address,
        /// Original token type used for payment
        original_token: address,
        /// Original amount sent
        original_amount: u64,
        /// Token type received by recipient
        received_token: address,
        /// Amount received by recipient (after fees and swaps)
        received_amount: u64,
        /// Fee amount deducted
        fee_amount: u64,
        /// Whether token swap was required
        swap_required: bool,
        /// Swap details/status
        swap_details: String,
        /// Transaction timestamp
        timestamp: u64,
        /// Payment status (0=pending, 1=completed, 2=failed)
        status: u8,
        /// Payment ID counter
        payment_id: u64,
    }

    /// Parameters for token swapping
    struct SwapParams has copy, drop, store {
        /// Input token address
        token_in: address,
        /// Output token address  
        token_out: address,
        /// Maximum slippage in basis points
        slippage_bps: u64,
        /// Minimum amount out expected
        min_amount_out: u64,
        /// Swap deadline timestamp
        deadline: u64,
    }

    /// Global payment counter
    struct PaymentCounter has key {
        counter: u64,
    }

    // ====== Events ======

    /// Emitted when a payment is initiated
    struct PaymentInitiatedEvent has drop, store {
        payment_id: u64,
        sender: address,
        recipient_face_hash: String,
        recipient_address: address,
        original_token: address,
        original_amount: u64,
        timestamp: u64,
    }

    /// Emitted when a payment is completed
    struct PaymentCompletedEvent has drop, store {
        payment_id: u64,
        sender: address,
        recipient_address: address,
        received_token: address,
        received_amount: u64,
        fee_amount: u64,
        swap_required: bool,
        timestamp: u64,
    }

    /// Emitted when a payment fails
    struct PaymentFailedEvent has drop, store {
        payment_id: u64,
        sender: address,
        recipient_face_hash: String,
        reason: String,
        timestamp: u64,
    }

    // ====== Functions ======

    /// Initialize the FacePay system (called once by admin)
    public entry fun initialize(admin: &signer, registry_admin: address) {
        let admin_addr = signer::address_of(admin);
        
        // Ensure only one system can be initialized
        assert!(!exists<FacePaySystem>(admin_addr), error::already_exists(E_SYSTEM_NOT_INITIALIZED));
        
        // Create admin capability
        let admin_cap = AdminCap {
            admin: admin_addr,
        };
        
        // Create main system
        let mut system = FacePaySystem {
            supported_tokens: smart_table::new(),
            min_amounts: smart_table::new(),
            fee_bps: DEFAULT_FEE_BPS,
            total_payments: 0,
            total_volume: 0,
            registry_admin,
            payment_initiated_events: account::new_event_handle<PaymentInitiatedEvent>(admin),
            payment_completed_events: account::new_event_handle<PaymentCompletedEvent>(admin),
            payment_failed_events: account::new_event_handle<PaymentFailedEvent>(admin),
        };

        // Add APT as default supported token
        let apt_token_address = @0x1; // APT token address
        smart_table::add(&mut system.supported_tokens, apt_token_address, true);
        smart_table::add(&mut system.min_amounts, apt_token_address, MIN_PAYMENT_AMOUNT);

        // Initialize payment counter
        let payment_counter = PaymentCounter {
            counter: 0,
        };
        
        // Store resources
        move_to(admin, admin_cap);
        move_to(admin, system);
        move_to(admin, payment_counter);
    }

    /// Pay someone by face hash (APT only, no swap needed)
    public entry fun pay_by_face_apt(
        sender: &signer,
        recipient_face_hash: String,
        amount: u64,
        system_admin: address,
    ) acquires FacePaySystem, PaymentCounter {
        let sender_addr = signer::address_of(sender);
        let current_time = timestamp::now_seconds();

        // Validate payment amount
        assert!(amount >= MIN_PAYMENT_AMOUNT, error::invalid_argument(E_INVALID_AMOUNT));

        // Get system
        assert!(exists<FacePaySystem>(system_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let system = borrow_global_mut<FacePaySystem>(system_admin);

        // Find recipient by face hash
        let recipient_address_opt = registry::get_user_by_face_hash(system.registry_admin, recipient_face_hash);
        assert!(option::is_some(&recipient_address_opt), error::not_found(E_RECIPIENT_NOT_FOUND));
        let recipient_address = option::extract(&mut recipient_address_opt);

        // Ensure sender is not paying themselves
        assert!(sender_addr != recipient_address, error::invalid_argument(E_SAME_SENDER_RECIPIENT));

        // Check sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, error::insufficient_funds(E_INSUFFICIENT_BALANCE));

        // Calculate fee
        let fee_amount = (amount * system.fee_bps) / 10000;
        let net_amount = amount - fee_amount;

        // Get payment ID
        let payment_counter = borrow_global_mut<PaymentCounter>(system_admin);
        payment_counter.counter = payment_counter.counter + 1;
        let payment_id = payment_counter.counter;

        // Create payment transaction record
        let payment_tx = PaymentTx {
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            original_token: @0x1, // APT
            original_amount: amount,
            received_token: @0x1, // APT
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            swap_details: string::utf8(b"No swap required - APT to APT"),
            timestamp: current_time,
            status: 1, // Completed
            payment_id,
        };

        // Withdraw coins from sender
        let payment_coins = coin::withdraw<AptosCoin>(sender, amount);
        
        // Split fee
        let fee_coins = coin::extract(&mut payment_coins, fee_amount);
        
        // Transfer fee to system admin (simplified - in production would go to treasury)
        coin::deposit(system_admin, fee_coins);
        
        // Transfer remaining payment to recipient
        coin::deposit(recipient_address, payment_coins);

        // Update system stats
        system.total_payments = system.total_payments + 1;
        system.total_volume = system.total_volume + amount;

        // Emit events
        event::emit_event(&mut system.payment_initiated_events, PaymentInitiatedEvent {
            payment_id,
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            original_token: @0x1,
            original_amount: amount,
            timestamp: current_time,
        });

        event::emit_event(&mut system.payment_completed_events, PaymentCompletedEvent {
            payment_id,
            sender: sender_addr,
            recipient_address,
            received_token: @0x1,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            timestamp: current_time,
        });

        // Store payment record
        move_to(sender, payment_tx);
    }

    /// Pay someone by face hash with user profile verification
    public entry fun pay_by_face_apt_with_profile(
        sender: &signer,
        recipient_face_hash: String,
        amount: u64,
        system_admin: address,
    ) acquires FacePaySystem, PaymentCounter {
        let sender_addr = signer::address_of(sender);
        let current_time = timestamp::now_seconds();

        // Validate payment amount
        assert!(amount >= MIN_PAYMENT_AMOUNT, error::invalid_argument(E_INVALID_AMOUNT));

        // Get system
        assert!(exists<FacePaySystem>(system_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let system = borrow_global_mut<FacePaySystem>(system_admin);

        // Find recipient by face hash
        let recipient_address_opt = registry::get_user_by_face_hash(system.registry_admin, recipient_face_hash);
        assert!(option::is_some(&recipient_address_opt), error::not_found(E_RECIPIENT_NOT_FOUND));
        let recipient_address = option::extract(&mut recipient_address_opt);

        // Verify user profile exists
        assert!(registry::user_profile_exists(recipient_address), error::not_found(E_RECIPIENT_NOT_FOUND));

        // Ensure sender is not paying themselves
        assert!(sender_addr != recipient_address, error::invalid_argument(E_SAME_SENDER_RECIPIENT));

        // Check sender has sufficient balance
        let sender_balance = coin::balance<AptosCoin>(sender_addr);
        assert!(sender_balance >= amount, error::insufficient_funds(E_INSUFFICIENT_BALANCE));

        // Calculate fee
        let fee_amount = (amount * system.fee_bps) / 10000;
        let net_amount = amount - fee_amount;

        // Get payment ID
        let payment_counter = borrow_global_mut<PaymentCounter>(system_admin);
        payment_counter.counter = payment_counter.counter + 1;
        let payment_id = payment_counter.counter;

        // Create payment transaction record
        let payment_tx = PaymentTx {
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            original_token: @0x1, // APT
            original_amount: amount,
            received_token: @0x1, // APT
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            swap_details: string::utf8(b"No swap required - APT to APT (verified)"),
            timestamp: current_time,
            status: 1, // Completed
            payment_id,
        };

        // Withdraw coins from sender
        let payment_coins = coin::withdraw<AptosCoin>(sender, amount);
        
        // Split fee
        let fee_coins = coin::extract(&mut payment_coins, fee_amount);
        
        // Transfer fee to system admin
        coin::deposit(system_admin, fee_coins);
        
        // Transfer remaining payment to recipient
        coin::deposit(recipient_address, payment_coins);

        // Update system stats
        system.total_payments = system.total_payments + 1;
        system.total_volume = system.total_volume + amount;

        // Emit events
        event::emit_event(&mut system.payment_initiated_events, PaymentInitiatedEvent {
            payment_id,
            sender: sender_addr,
            recipient_face_hash,
            recipient_address,
            original_token: @0x1,
            original_amount: amount,
            timestamp: current_time,
        });

        event::emit_event(&mut system.payment_completed_events, PaymentCompletedEvent {
            payment_id,
            sender: sender_addr,
            recipient_address,
            received_token: @0x1,
            received_amount: net_amount,
            fee_amount,
            swap_required: false,
            timestamp: current_time,
        });

        // Store payment record
        move_to(sender, payment_tx);
    }

    /// Get user's preferred token from registry
    public fun get_recipient_preferences(
        registry_admin: address,
        face_hash: String
    ): option::Option<address> {
        registry::get_user_by_face_hash(registry_admin, face_hash)
    }

    /// Check if token is supported
    public fun is_token_supported(system_admin: address, token_address: address): bool acquires FacePaySystem {
        if (!exists<FacePaySystem>(system_admin)) {
            return false
        };
        
        let system = borrow_global<FacePaySystem>(system_admin);
        smart_table::contains(&system.supported_tokens, token_address)
    }

    /// Get minimum payment amount for token
    public fun get_min_payment_amount(system_admin: address, token_address: address): u64 acquires FacePaySystem {
        if (!exists<FacePaySystem>(system_admin)) {
            return MIN_PAYMENT_AMOUNT
        };
        
        let system = borrow_global<FacePaySystem>(system_admin);
        if (smart_table::contains(&system.min_amounts, token_address)) {
            *smart_table::borrow(&system.min_amounts, token_address)
        } else {
            MIN_PAYMENT_AMOUNT
        }
    }

    /// Get system statistics
    public fun get_system_stats(system_admin: address): (u64, u64, u64) acquires FacePaySystem {
        if (!exists<FacePaySystem>(system_admin)) {
            return (0, 0, 0)
        };
        
        let system = borrow_global<FacePaySystem>(system_admin);
        (system.total_payments, system.total_volume, system.fee_bps)
    }

    /// Get payment transaction details
    public fun get_payment_details(payment_tx: &PaymentTx): (
        address, // sender
        String,  // recipient_face_hash
        address, // recipient_address
        address, // original_token
        u64,     // original_amount
        address, // received_token
        u64,     // received_amount
        u64,     // fee_amount
        bool,    // swap_required
        String,  // swap_details
        u64,     // timestamp
        u8,      // status
        u64      // payment_id
    ) {
        (
            payment_tx.sender,
            payment_tx.recipient_face_hash,
            payment_tx.recipient_address,
            payment_tx.original_token,
            payment_tx.original_amount,
            payment_tx.received_token,
            payment_tx.received_amount,
            payment_tx.fee_amount,
            payment_tx.swap_required,
            payment_tx.swap_details,
            payment_tx.timestamp,
            payment_tx.status,
            payment_tx.payment_id
        )
    }

    // ====== Admin Functions ======

    /// Add supported token (admin only)
    public entry fun add_supported_token(
        admin: &signer,
        token_address: address,
        min_amount: u64,
        system_admin: address,
    ) acquires AdminCap, FacePaySystem {
        let admin_addr = signer::address_of(admin);
        
        // Check admin capability
        assert!(exists<AdminCap>(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        let admin_cap = borrow_global<AdminCap>(admin_addr);
        assert!(admin_cap.admin == admin_addr, error::permission_denied(E_NOT_AUTHORIZED));

        // Get system
        assert!(exists<FacePaySystem>(system_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let system = borrow_global_mut<FacePaySystem>(system_admin);

        // Add token
        smart_table::add(&mut system.supported_tokens, token_address, true);
        smart_table::add(&mut system.min_amounts, token_address, min_amount);
    }

    /// Remove supported token (admin only)
    public entry fun remove_supported_token(
        admin: &signer,
        token_address: address,
        system_admin: address,
    ) acquires AdminCap, FacePaySystem {
        let admin_addr = signer::address_of(admin);
        
        // Check admin capability
        assert!(exists<AdminCap>(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        let admin_cap = borrow_global<AdminCap>(admin_addr);
        assert!(admin_cap.admin == admin_addr, error::permission_denied(E_NOT_AUTHORIZED));

        // Get system
        assert!(exists<FacePaySystem>(system_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let system = borrow_global_mut<FacePaySystem>(system_admin);

        // Remove token
        if (smart_table::contains(&system.supported_tokens, token_address)) {
            smart_table::remove(&mut system.supported_tokens, token_address);
        };
        if (smart_table::contains(&system.min_amounts, token_address)) {
            smart_table::remove(&mut system.min_amounts, token_address);
        };
    }

    /// Update fee percentage (admin only)
    public entry fun update_fee_bps(
        admin: &signer,
        new_fee_bps: u64,
        system_admin: address,
    ) acquires AdminCap, FacePaySystem {
        let admin_addr = signer::address_of(admin);
        
        // Check admin capability
        assert!(exists<AdminCap>(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        let admin_cap = borrow_global<AdminCap>(admin_addr);
        assert!(admin_cap.admin == admin_addr, error::permission_denied(E_NOT_AUTHORIZED));

        // Validate fee (max 10%)
        assert!(new_fee_bps <= 1000, error::invalid_argument(E_INVALID_AMOUNT));

        // Get system
        assert!(exists<FacePaySystem>(system_admin), error::not_found(E_SYSTEM_NOT_INITIALIZED));
        let system = borrow_global_mut<FacePaySystem>(system_admin);

        // Update fee
        system.fee_bps = new_fee_bps;
    }

    // ====== View Functions ======

    /// Check if system is initialized
    public fun is_system_initialized(system_admin: address): bool {
        exists<FacePaySystem>(system_admin)
    }

    /// Check if payment transaction exists
    public fun payment_tx_exists(user_address: address): bool {
        exists<PaymentTx>(user_address)
    }

    /// Get current payment counter
    public fun get_payment_counter(system_admin: address): u64 acquires PaymentCounter {
        if (!exists<PaymentCounter>(system_admin)) {
            return 0
        };
        
        let counter = borrow_global<PaymentCounter>(system_admin);
        counter.counter
    }

    #[test_only]
    public fun init_for_testing(admin: &signer, registry_admin: address) {
        initialize(admin, registry_admin);
    }
} 