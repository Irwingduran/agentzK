use poseidon::poseidon::bn254::hash_3;

fn main(
    spending_limit: pub Field,
    window_id: pub Field,
    old_commitment: pub Field,
    new_commitment: pub Field,
    old_accumulated: Field,
    old_nonce: Field,
    amount: Field,
    new_nonce: Field,
) {
    let computed_old = hash_3([old_accumulated, old_nonce, window_id]);
    assert(computed_old == old_commitment);

    let new_accumulated = old_accumulated + amount;

    assert(new_accumulated as u64 <= spending_limit as u64);
    assert(amount as u64 > 0);

    let computed_new = hash_3([new_accumulated, new_nonce, window_id]);
    assert(computed_new == new_commitment);
}

// Helper: compute a commitment from accumulated, nonce, and window_id
// Used by the SDK to prepare inputs before calling the full circuit
#[export]
fn compute_commitment(accumulated: Field, nonce: Field, window_id: Field) -> Field {
    hash_3([accumulated, nonce, window_id])
}

#[test]
fn test_happy_path() {
    let old_accumulated: Field = 0;
    let old_nonce: Field = 12345;
    let window_id: Field = 20260701;
    let spending_limit: Field = 1000;
    let amount: Field = 312;
    let new_nonce: Field = 67890;

    let old_commitment = hash_3([old_accumulated, old_nonce, window_id]);
    let new_accumulated = old_accumulated + amount;
    let new_commitment = hash_3([new_accumulated, new_nonce, window_id]);

    main(
        spending_limit, window_id, old_commitment, new_commitment,
        old_accumulated, old_nonce, amount, new_nonce,
    );
}

#[test]
fn test_exceeds_limit() {
    let old_accumulated: Field = 800;
    let old_nonce: Field = 12345;
    let window_id: Field = 20260701;
    let spending_limit: Field = 1000;
    let amount: Field = 300;
    let new_nonce: Field = 67890;

    let old_commitment = hash_3([old_accumulated, old_nonce, window_id]);

    // new_accumulated = 1100 > 1000 → should fail
    let new_accumulated = old_accumulated + amount;
    let new_commitment = hash_3([new_accumulated, new_nonce, window_id]);

    main(
        spending_limit, window_id, old_commitment, new_commitment,
        old_accumulated, old_nonce, amount, new_nonce,
    );
}

#[test]
fn test_negative_amount() {
    let old_accumulated: Field = 0;
    let old_nonce: Field = 12345;
    let window_id: Field = 20260701;
    let spending_limit: Field = 1000;
    let amount: Field = 0;
    let new_nonce: Field = 67890;

    let old_commitment = hash_3([old_accumulated, old_nonce, window_id]);
    let new_accumulated = old_accumulated + amount;
    let new_commitment = hash_3([new_accumulated, new_nonce, window_id]);

    main(
        spending_limit, window_id, old_commitment, new_commitment,
        old_accumulated, old_nonce, amount, new_nonce,
    );
}
