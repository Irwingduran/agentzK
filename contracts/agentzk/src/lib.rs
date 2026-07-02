#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Bytes, BytesN, Address, Env};

mod verifier;
use verifier::verify_ultrahonk_proof;

#[contracttype]
pub enum DataKey {
    Commitment(Address),
    SpendLimit(Address),
    WindowId(Address),
}

#[contract]
pub struct AgentZK;

#[contractimpl]
impl AgentZK {
    /// Initialize an agent with a spending limit and initial commitment.
    /// Called once by the operator when registering the agent.
    pub fn register(
        env: Env,
        agent: Address,
        spending_limit: u64,
        window_id: u64,
        initial_commitment: BytesN<32>,
    ) {
        agent.require_auth();

        env.storage().instance().set(
            &DataKey::SpendLimit(agent.clone()),
            &spending_limit,
        );
        env.storage().instance().set(
            &DataKey::WindowId(agent.clone()),
            &window_id,
        );
        env.storage().instance().set(
            &DataKey::Commitment(agent),
            &initial_commitment,
        );
    }

    /// Verify a ZK proof and, if valid, advance the commitment.
    /// Returns true if the proof was accepted and state was advanced.
    pub fn verify_and_advance(
        env: Env,
        agent: Address,
        proof: Bytes,
        new_commitment: BytesN<32>,
        new_window_id: u64,
    ) -> bool {
        agent.require_auth();

        let old_commitment: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::Commitment(agent.clone()))
            .unwrap();

        let spending_limit: u64 = env
            .storage()
            .instance()
            .get(&DataKey::SpendLimit(agent.clone()))
            .unwrap();

        let valid = verify_ultrahonk_proof(
            &env,
            &proof,
            &spending_limit,
            &new_window_id,
            &old_commitment,
            &new_commitment,
        );

        if valid {
            env.storage().instance().set(
                &DataKey::Commitment(agent.clone()),
                &new_commitment,
            );
            env.storage().instance().set(
                &DataKey::WindowId(agent),
                &new_window_id,
            );
        }

        valid
    }

    /// Read the current commitment for an agent.
    pub fn get_commitment(env: Env, agent: Address) -> Option<BytesN<32>> {
        env.storage().instance().get(&DataKey::Commitment(agent))
    }

    /// Read the current spending limit for an agent.
    pub fn get_spend_limit(env: Env, agent: Address) -> Option<u64> {
        env.storage().instance().get(&DataKey::SpendLimit(agent))
    }

    /// Read the current window id for an agent.
    pub fn get_window_id(env: Env, agent: Address) -> Option<u64> {
        env.storage().instance().get(&DataKey::WindowId(agent))
    }
}

mod test;
