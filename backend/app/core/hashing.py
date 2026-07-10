# ==============================================================================
# Hospital Information Assistance — Password Hashing
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Passwords must NEVER be stored as plain text in the database.
#   If the database is hacked, plain text passwords expose all users.
#   bcrypt hashing solves this by converting passwords into an irreversible hash.
#
# HOW BCRYPT WORKS:
#   1. User registers with password: "SecurePass123"
#   2. bcrypt generates a random "salt" (extra random data)
#   3. password + salt → hashed string: "$2b$12$xyz..."
#   4. Only the hash is stored in the database
#   5. When the user logs in, bcrypt compares the plain password
#      against the stored hash — without reversing it
#
# WHY BCRYPT IS SECURE:
#   - It is intentionally slow (takes ~100ms) — makes brute force attacks slow
#   - Each hash is unique even for the same password (due to the random salt)
#   - The original password CANNOT be recovered from the hash
#
# USAGE:
#   from app.core.hashing import hash_password, verify_password
# ==============================================================================

import bcrypt


# ------------------------------------------------------------------------------
# HASH PASSWORD
# WHY: Called during user registration to convert the plain text password
#      into a secure hash before storing it in the database.
# WHAT: Uses bcrypt to generate a one-way hash of the password.
# INPUT:  plain_password → the raw password string from the registration form
# OUTPUT: A bcrypt hash string (e.g., "$2b$12$rM3Tl7...")
#         This is what gets stored in the `hashed_password` column.
# ------------------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    Call this during user registration before saving to the database.

    Args:
        plain_password: The raw password provided by the user during registration.

    Returns:
        A bcrypt hash string safe to store in the database.
        Example: "$2b$12$rM3Tl7XlOPJM3..."
    """
    password_bytes = plain_password.encode('utf-8')
    # Generate salt with standard work factor of 12
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


# ------------------------------------------------------------------------------
# VERIFY PASSWORD
# WHY: Called during user login to check if the entered password matches
#      the hash stored in the database.
# WHAT: Uses bcrypt to compare the plain password against the stored hash.
#       Returns True if they match, False otherwise.
# INPUT:
#   - plain_password → the password entered by the user at login
#   - hashed_password → the hash stored in the database
# OUTPUT: True (passwords match) or False (passwords don't match)
# ------------------------------------------------------------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored bcrypt hash.
    Call this during user login to check if the password is correct.

    Args:
        plain_password: The password entered by the user at login.
        hashed_password: The bcrypt hash stored in the database.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


# ------------------------------------------------------------------------------
# CHECK IF PASSWORD NEEDS REHASHING
# WHY: If we ever upgrade our hashing algorithm, existing passwords stored
#      with the old algorithm should be re-hashed on next login.
# WHAT: Placeholder fallback returned false since standard bcrypt rounds is used.
# INPUT:  hashed_password → the hash stored in the database
# OUTPUT: False (current algorithm is up-to-date)
# ------------------------------------------------------------------------------
def needs_rehash(hashed_password: str) -> bool:
    """
    Checks if a stored password hash needs to be re-hashed.
    """
    return False
