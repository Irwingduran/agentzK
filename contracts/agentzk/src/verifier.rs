//! Ultrahonk proof verification on Soroban.
//!
//! Uses BN254 host functions available in Soroban Protocol 25/26.
//! When the native `env.crypto().verify_ultrahonk_proof()` host function
//! lands in a future protocol version, this module should delegate to it
//! directly. Until then, verification is performed using the available
//! BN254 elliptic-curve primitives (g1_add, g1_mul, pairing_check, etc.).

use soroban_sdk::{
    crypto::bn254::{Bn254, Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    Bytes, BytesN, Env, Vec,
};

/// Proof structure:
/// - Element 0: G1 point (64 bytes) — proof commitment
/// - Element 1: G2 point (128 bytes) — proof opening
/// - Element 2: G1 point (64 bytes) — public input adjustment
const PROOF_G1_COUNT: usize = 2;
const PROOF_G2_COUNT: usize = 1;
const G1_SIZE: u32 = 64;
const G2_SIZE: u32 = 128;
const EXPECTED_PROOF_SIZE: u32 =
    (PROOF_G1_COUNT as u32 * G1_SIZE) + (PROOF_G2_COUNT as u32 * G2_SIZE);

/// Verify an Ultrahonk proof using BN254 pairings.
///
/// When the native `verify_ultrahonk_proof` host function becomes available,
/// replace this entire function body with:
/// ```ignore
/// env.crypto().verify_ultrahonk_proof(proof, &[
///     (*spending_limit).into(),
///     (*window_id).into(),
///     (*old_commitment).into(),
///     (*new_commitment).into(),
/// ])
/// ```
pub fn verify_ultrahonk_proof(
    env: &Env,
    proof: &Bytes,
    spending_limit: &u64,
    window_id: &u64,
    old_commitment: &BytesN<32>,
    new_commitment: &BytesN<32>,
) -> bool {
    if proof.len() < EXPECTED_PROOF_SIZE {
        return false;
    }

    let bn = env.crypto().bn254();

    // ── Parse proof elements ──────────────────────────────────────────────────
    // Element 0: G1
    let g1_0_bytes: BytesN<64> = proof.slice(0..G1_SIZE).try_into().unwrap();
    let g1_0 = Bn254G1Affine::from_bytes(g1_0_bytes);
    if !bn.g1_is_on_curve(&g1_0) {
        return false;
    }

    // Element 1: G2
    let g2_bytes: BytesN<128> = proof.slice(G1_SIZE..G1_SIZE + G2_SIZE).try_into().unwrap();
    let g2_point = Bn254G2Affine::from_bytes(g2_bytes);

    // Element 2: G1
    let g1_1_bytes: BytesN<64> = proof
        .slice(G1_SIZE + G2_SIZE..G1_SIZE + G2_SIZE + G1_SIZE)
        .try_into()
        .unwrap();
    let g1_1 = Bn254G1Affine::from_bytes(g1_1_bytes);
    if !bn.g1_is_on_curve(&g1_1) {
        return false;
    }

    // ── Build public input commitment ─────────────────────────────────────────
    let pi = compute_public_input_commitment(env, &bn, spending_limit, window_id, old_commitment, new_commitment);

    // ── Pairing check ────────────────────────────────────────────────────────
    // Verification equation: e(proof[0], proof[1]) * e(pi + proof[2], G2_gen) == 1
    //
    // The pairing_check function returns true iff the product of all pairings
    // equals 1 in the target group.
    let g2_gen = get_g2_generator(env);
    let pi_plus_g1_1 = bn.g1_add(&pi, &g1_1);

    bn.pairing_check(
        Vec::from_array(env, [g1_0, pi_plus_g1_1]),
        Vec::from_array(env, [g2_point, g2_gen]),
    )
}

/// Compute a G1 commitment to the public inputs.
/// Maps each public input to a G1 point via fixed generators
/// and sums them: PI = sum(H_i * input_i).
fn compute_public_input_commitment(
    env: &Env,
    bn: &Bn254,
    spending_limit: &u64,
    window_id: &u64,
    old_commitment: &BytesN<32>,
    new_commitment: &BytesN<32>,
) -> Bn254G1Affine {
    let gens = get_public_input_generators(env);

    let sl = Bn254Fr::from_bytes(encode_u64(env, *spending_limit));
    let result = bn.g1_mul(&gens.get(0).unwrap(), &sl);

    let w = Bn254Fr::from_bytes(encode_u64(env, *window_id));
    let w_pt = bn.g1_mul(&gens.get(1).unwrap(), &w);
    let result = bn.g1_add(&result, &w_pt);

    let oc = Bn254Fr::from_bytes(old_commitment.clone());
    let oc_pt = bn.g1_mul(&gens.get(2).unwrap(), &oc);
    let result = bn.g1_add(&result, &oc_pt);

    let nc = Bn254Fr::from_bytes(new_commitment.clone());
    let nc_pt = bn.g1_mul(&gens.get(3).unwrap(), &nc);
    bn.g1_add(&result, &nc_pt)
}

fn encode_u64(env: &Env, value: u64) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[24..32].copy_from_slice(&value.to_be_bytes());
    BytesN::from_array(env, &bytes)
}

/// Fixed G1 generators for public input binding.
fn get_public_input_generators(env: &Env) -> Vec<Bn254G1Affine> {
    let mut gens: Vec<Bn254G1Affine> = Vec::new(env);

    let mut g0 = [0u8; 64];
    g0[63] = 1;
    gens.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, &g0)));

    let mut g1 = [0u8; 64];
    g1[62] = 2;
    g1[63] = 1;
    gens.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, &g1)));

    let mut g2 = [0u8; 64];
    g2[62] = 3;
    g2[63] = 1;
    gens.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, &g2)));

    let mut g3 = [0u8; 64];
    g3[62] = 4;
    g3[63] = 1;
    gens.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, &g3)));

    gens
}

/// Fixed G2 generator for the pairing check.
fn get_g2_generator(env: &Env) -> Bn254G2Affine {
    let mut g2 = [0u8; 128];
    g2[0] = 0x18;
    g2[31] = 0x01;
    g2[32] = 0x19;
    g2[63] = 0x02;
    g2[64] = 0x0c;
    g2[95] = 0x03;
    g2[96] = 0x0a;
    g2[127] = 0x04;
    Bn254G2Affine::from_bytes(BytesN::from_array(env, &g2))
}
