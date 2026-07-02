#![cfg(test)]

use super::*;
use soroban_sdk::{Bytes, BytesN, Env, Address};
use soroban_sdk::testutils::Address as _;

#[test]
fn test_register_and_read_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentZK, ());
    let client = AgentZKClient::new(&env, &contract_id);

    let agent = Address::generate(&env);
    let initial_commitment = BytesN::from_array(&env, &[2u8; 32]);
    let spending_limit: u64 = 1000;
    let window_id: u64 = 20260701;

    client.register(&agent, &spending_limit, &window_id, &initial_commitment);

    let stored_limit = client.get_spend_limit(&agent);
    assert_eq!(stored_limit, Some(1000));

    let stored_window = client.get_window_id(&agent);
    assert_eq!(stored_window, Some(20260701));

    let stored_cmt = client.get_commitment(&agent);
    assert_eq!(stored_cmt, Some(initial_commitment));
}

#[test]
fn test_verify_and_advance_rejects_short_proof() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentZK, ());
    let client = AgentZKClient::new(&env, &contract_id);

    let agent = Address::generate(&env);
    let initial_commitment = BytesN::from_array(&env, &[2u8; 32]);
    let spending_limit: u64 = 1000;
    let window_id: u64 = 20260701;

    client.register(&agent, &spending_limit, &window_id, &initial_commitment);

    let proof = Bytes::from_array(&env, &[0u8; 10]);
    let new_commitment = BytesN::from_array(&env, &[3u8; 32]);

    let accepted = client.verify_and_advance(&agent, &proof, &new_commitment, &window_id);
    assert!(!accepted);
}

#[test]
fn test_verify_and_advance_does_not_update_state_on_reject() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentZK, ());
    let client = AgentZKClient::new(&env, &contract_id);

    let agent = Address::generate(&env);
    let initial_commitment = BytesN::from_array(&env, &[2u8; 32]);
    let spending_limit: u64 = 1000;
    let window_id: u64 = 20260701;

    client.register(&agent, &spending_limit, &window_id, &initial_commitment);

    let before = client.get_commitment(&agent);
    assert_eq!(before, Some(initial_commitment.clone()));

    let proof = Bytes::from_array(&env, &[0u8; 10]);
    let new_commitment = BytesN::from_array(&env, &[4u8; 32]);

    let accepted = client.verify_and_advance(&agent, &proof, &new_commitment, &window_id);
    assert!(!accepted);

    let after = client.get_commitment(&agent);
    assert_eq!(after, Some(initial_commitment));
    assert_eq!(accepted, false);
}
