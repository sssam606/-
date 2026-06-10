# Security Spec for Student Demerit System

## 1. Data Invariants
- Only authenticated users (Teachers) can create or update demerit records.
- Records can only be updated if `parentAck` changes from `false` to `true` (Parent acknowledges). Other fields (student name, teacher name, points, dates) are immutable after creation.
- A demerit record's ID must conform to valid alphanumeric formats.
- Timestamp fields must be server-validated.

## 2. The "Dirty Dozen" Payloads (Exploit Vector Simulation)
1. **Unauthenticated Write**: Creating a demerit record without standard session headers.
2. **Identity Spoofing**: Recording an infraction under a different teacher's name or authorization token.
3. **Ghost Field Write**: Adding a property like `approvedByDirector=true` that was never declared in our schema footprint.
4. **Mutating Immortal Fields**: Changing `studentName`, `studentId`, or `totalPoints` after the record is published.
5. **Score Injection**: Forcing negative total points (`totalPoints = -50`) to credit students artificially.
6. **Student Self-Amnesty**: A simulated student trying to delete their infraction record via client-side operations.
7. **Bypassing Signature Integrity**: Logging a record with empty signature canvases or corrupted ID strings.
8. **Malicious Signature Blob Overwrite**: Writing a 50MB junk string as a signature representation to cause Denali of Wallet exhaustion.
9. **Fake Parent Bypass**: A student modifying `parentAck = true` themselves without providing a parent canvas signature.
10. **Spoofing Timestamp**: Injecting a mock historic timestamp (`createdAt = '2000-01-01'`) instead of relying on secure server timing.
11. **Relational ID Poisoning**: Using cross-site script characters or massive size strings for `studentId`.
12. **Blanket Query Scraping**: Fetching the full system database using unconstrained `getDocs()` without specifying individual Student ID boundaries.

## 3. Test Cases (TDD Verification Map)
- Authenticated create request -> ALLOW (if valid)
- Anonymous create request -> DENIED
- Modify studentName on update -> DENIED
- Delete record request -> DENIED
- Acknowledge record update with parent signature and parentAck -> ALLOW
