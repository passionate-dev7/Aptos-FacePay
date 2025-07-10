/// Registry module for FacePay system
/// Manages facial hash to address mapping and user preferences
module facepay::registry {
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};
    use std::signer;
    use std::error;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_std::smart_table::{Self, SmartTable};

    // ====== Error Codes ======
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_USER_ALREADY_EXISTS: u64 = 2;
    const E_USER_NOT_FOUND: u64 = 3;
    const E_INVALID_FACE_HASH: u64 = 4;
    const E_INVALID_TOKEN_ADDRESS: u64 = 5;
    const E_REGISTRY_NOT_INITIALIZED: u64 = 6;

    // ====== Structs ======

    /// Configuration for the registry
    struct RegistryConfig has key {
        /// Maps facial hash to user address
        face_to_user: SmartTable<String, address>,
        /// Maps address to user profile existence
        address_to_user: SmartTable<address, bool>,
        /// Total number of registered users
        user_count: u64,
        /// Events
        user_registered_events: EventHandle<UserRegisteredEvent>,
        user_preferences_updated_events: EventHandle<UserPreferencesUpdatedEvent>,
        user_verification_updated_events: EventHandle<UserVerificationUpdatedEvent>,
    }

    /// Individual user profile
    struct UserProfile has key {
        /// User's Aptos address
        aptos_address: address,
        /// SHA-256 hashed facial descriptor
        face_hash: String,
        /// Storage blob ID storing facial data
        storage_blob_id: String,
        /// Preferred token for receiving payments (default APT)
        preferred_token: address,
        /// User's display name (optional)
        display_name: String,
        /// Registration timestamp
        created_at: u64,
        /// Last updated timestamp
        updated_at: u64,
        /// Whether user is verified
        is_verified: bool,
        /// Number of successful payments received
        payment_count: u64,
    }

    /// Admin capability for registry management
    struct AdminCap has key {
        /// Admin address
        admin: address,
    }

    // ====== Events ======

    /// Emitted when a new user registers
    struct UserRegisteredEvent has drop, store {
        user_address: address,
        face_hash: String,
        storage_blob_id: String,
        timestamp: u64,
    }

    /// Emitted when user preferences are updated
    struct UserPreferencesUpdatedEvent has drop, store {
        user_address: address,
        preferred_token: address,
        display_name: String,
        timestamp: u64,
    }

    /// Emitted when user verification status changes
    struct UserVerificationUpdatedEvent has drop, store {
        user_address: address,
        is_verified: bool,
        timestamp: u64,
    }

    // ====== Functions ======

    /// Initialize the registry (called once by admin)
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Ensure only one registry can be initialized
        assert!(!exists<RegistryConfig>(admin_addr), error::already_exists(E_USER_ALREADY_EXISTS));
        
        // Create admin capability
        let admin_cap = AdminCap {
            admin: admin_addr,
        };
        
        // Create registry configuration
        let registry_config = RegistryConfig {
            face_to_user: smart_table::new(),
            address_to_user: smart_table::new(),
            user_count: 0,
            user_registered_events: account::new_event_handle<UserRegisteredEvent>(admin),
            user_preferences_updated_events: account::new_event_handle<UserPreferencesUpdatedEvent>(admin),
            user_verification_updated_events: account::new_event_handle<UserVerificationUpdatedEvent>(admin),
        };
        
        // Store resources
        move_to(admin, admin_cap);
        move_to(admin, registry_config);
    }

    /// Register a new user with facial hash
    public entry fun register_user(
        user: &signer,
        face_hash: String,
        storage_blob_id: String,
        preferred_token: address,
        display_name: String,
        registry_admin: address,
    ) acquires RegistryConfig {
        let user_addr = signer::address_of(user);
        let current_time = timestamp::now_seconds();

        // Validate inputs
        assert!(!string::is_empty(&face_hash), error::invalid_argument(E_INVALID_FACE_HASH));
        
        // Get registry config
        assert!(exists<RegistryConfig>(registry_admin), error::not_found(E_REGISTRY_NOT_INITIALIZED));
        let registry_config = borrow_global_mut<RegistryConfig>(registry_admin);

        // Check if user already exists
        assert!(!smart_table::contains(&registry_config.face_to_user, face_hash), error::already_exists(E_USER_ALREADY_EXISTS));
        assert!(!smart_table::contains(&registry_config.address_to_user, user_addr), error::already_exists(E_USER_ALREADY_EXISTS));

        // Create user profile
        let user_profile = UserProfile {
            aptos_address: user_addr,
            face_hash,
            storage_blob_id,
            preferred_token,
            display_name,
            created_at: current_time,
            updated_at: current_time,
            is_verified: false,
            payment_count: 0,
        };

        // Add to registries
        smart_table::add(&mut registry_config.face_to_user, user_profile.face_hash, user_addr);
        smart_table::add(&mut registry_config.address_to_user, user_addr, true);
        registry_config.user_count = registry_config.user_count + 1;

        // Emit event
        event::emit_event(&mut registry_config.user_registered_events, UserRegisteredEvent {
            user_address: user_addr,
            face_hash: user_profile.face_hash,
            storage_blob_id: user_profile.storage_blob_id,
            timestamp: current_time,
        });

        // Store profile
        move_to(user, user_profile);
    }

    /// Update user preferences
    public entry fun update_preferences(
        user: &signer,
        preferred_token: address,
        display_name: String,
        registry_admin: address,
    ) acquires UserProfile, RegistryConfig {
        let user_addr = signer::address_of(user);
        let current_time = timestamp::now_seconds();

        // Get user profile
        assert!(exists<UserProfile>(user_addr), error::not_found(E_USER_NOT_FOUND));
        let user_profile = borrow_global_mut<UserProfile>(user_addr);

        // Update preferences
        user_profile.preferred_token = preferred_token;
        user_profile.display_name = display_name;
        user_profile.updated_at = current_time;

        // Emit event
        let registry_config = borrow_global_mut<RegistryConfig>(registry_admin);
        event::emit_event(&mut registry_config.user_preferences_updated_events, UserPreferencesUpdatedEvent {
            user_address: user_addr,
            preferred_token,
            display_name,
            timestamp: current_time,
        });
    }

    /// Get user by facial hash
    public fun get_user_by_face_hash(registry_admin: address, face_hash: String): Option<address> acquires RegistryConfig {
        if (!exists<RegistryConfig>(registry_admin)) {
            return option::none()
        };
        
        let registry_config = borrow_global<RegistryConfig>(registry_admin);
        if (smart_table::contains(&registry_config.face_to_user, face_hash)) {
            option::some(*smart_table::borrow(&registry_config.face_to_user, face_hash))
        } else {
            option::none()
        }
    }

    /// Get user by Aptos address
    public fun get_user_by_address(registry_admin: address, aptos_address: address): Option<bool> acquires RegistryConfig {
        if (!exists<RegistryConfig>(registry_admin)) {
            return option::none()
        };
        
        let registry_config = borrow_global<RegistryConfig>(registry_admin);
        if (smart_table::contains(&registry_config.address_to_user, aptos_address)) {
            option::some(*smart_table::borrow(&registry_config.address_to_user, aptos_address))
        } else {
            option::none()
        }
    }

    /// Get user payment info directly from user profile
    public fun get_payment_info_from_profile(user_profile: &UserProfile): (address, address) {
        (user_profile.aptos_address, user_profile.preferred_token)
    }

    /// Helper function to verify face hash matches profile
    public fun verify_face_hash_matches(user_profile: &UserProfile, face_hash: String): bool {
        user_profile.face_hash == face_hash
    }

    /// Check if user exists by face hash
    public fun user_exists_by_face(registry_admin: address, face_hash: String): bool acquires RegistryConfig {
        if (!exists<RegistryConfig>(registry_admin)) {
            return false
        };
        
        let registry_config = borrow_global<RegistryConfig>(registry_admin);
        smart_table::contains(&registry_config.face_to_user, face_hash)
    }

    /// Check if user exists by address
    public fun user_exists_by_address(registry_admin: address, aptos_address: address): bool acquires RegistryConfig {
        if (!exists<RegistryConfig>(registry_admin)) {
            return false
        };
        
        let registry_config = borrow_global<RegistryConfig>(registry_admin);
        smart_table::contains(&registry_config.address_to_user, aptos_address)
    }

    /// Increment payment count for user
    public fun increment_payment_count(user_profile: &mut UserProfile) {
        user_profile.payment_count = user_profile.payment_count + 1;
    }

    /// Get user profile details
    public fun get_user_info(user_profile: &UserProfile): (
        address, // aptos_address
        String,  // face_hash
        String,  // storage_blob_id
        address, // preferred_token
        String,  // display_name
        u64,     // created_at
        u64,     // updated_at
        bool,    // is_verified
        u64      // payment_count
    ) {
        (
            user_profile.aptos_address,
            user_profile.face_hash,
            user_profile.storage_blob_id,
            user_profile.preferred_token,
            user_profile.display_name,
            user_profile.created_at,
            user_profile.updated_at,
            user_profile.is_verified,
            user_profile.payment_count
        )
    }

    /// Get registry statistics
    public fun get_registry_stats(registry_admin: address): u64 acquires RegistryConfig {
        if (!exists<RegistryConfig>(registry_admin)) {
            return 0
        };
        
        let registry_config = borrow_global<RegistryConfig>(registry_admin);
        registry_config.user_count
    }

    /// Get user's preferred token
    public fun get_preferred_token(user_profile: &UserProfile): address {
        user_profile.preferred_token
    }

    /// Get user's Aptos address
    public fun get_aptos_address(user_profile: &UserProfile): address {
        user_profile.aptos_address
    }

    /// Check if user is verified
    public fun is_verified(user_profile: &UserProfile): bool {
        user_profile.is_verified
    }

    // ====== Admin Functions ======

    /// Verify a user (admin only)
    public entry fun verify_user(
        admin: &signer,
        user_address: address,
        registry_admin: address,
    ) acquires AdminCap, UserProfile, RegistryConfig {
        let admin_addr = signer::address_of(admin);
        
        // Check admin capability
        assert!(exists<AdminCap>(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        let admin_cap = borrow_global<AdminCap>(admin_addr);
        assert!(admin_cap.admin == admin_addr, error::permission_denied(E_NOT_AUTHORIZED));

        // Get user profile
        assert!(exists<UserProfile>(user_address), error::not_found(E_USER_NOT_FOUND));
        let user_profile = borrow_global_mut<UserProfile>(user_address);
        
        let current_time = timestamp::now_seconds();
        user_profile.is_verified = true;
        user_profile.updated_at = current_time;

        // Emit event
        let registry_config = borrow_global_mut<RegistryConfig>(registry_admin);
        event::emit_event(&mut registry_config.user_verification_updated_events, UserVerificationUpdatedEvent {
            user_address,
            is_verified: true,
            timestamp: current_time,
        });
    }

    /// Unverify a user (admin only)
    public entry fun unverify_user(
        admin: &signer,
        user_address: address,
        registry_admin: address,
    ) acquires AdminCap, UserProfile, RegistryConfig {
        let admin_addr = signer::address_of(admin);
        
        // Check admin capability
        assert!(exists<AdminCap>(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        let admin_cap = borrow_global<AdminCap>(admin_addr);
        assert!(admin_cap.admin == admin_addr, error::permission_denied(E_NOT_AUTHORIZED));

        // Get user profile
        assert!(exists<UserProfile>(user_address), error::not_found(E_USER_NOT_FOUND));
        let user_profile = borrow_global_mut<UserProfile>(user_address);
        
        let current_time = timestamp::now_seconds();
        user_profile.is_verified = false;
        user_profile.updated_at = current_time;

        // Emit event
        let registry_config = borrow_global_mut<RegistryConfig>(registry_admin);
        event::emit_event(&mut registry_config.user_verification_updated_events, UserVerificationUpdatedEvent {
            user_address,
            is_verified: false,
            timestamp: current_time,
        });
    }

    // ====== View Functions ======

    /// Check if registry is initialized
    public fun is_registry_initialized(registry_admin: address): bool {
        exists<RegistryConfig>(registry_admin)
    }

    /// Check if user profile exists
    public fun user_profile_exists(user_address: address): bool {
        exists<UserProfile>(user_address)
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        initialize(admin);
    }
} 