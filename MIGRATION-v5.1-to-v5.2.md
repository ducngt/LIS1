# Migration V5.1 -> V5.2

1. Stop V5.1 and back up the entire `data/` directory.
2. Keep the same `NUTE_MASTER_ENCRYPTION_KEY` / `data/system.key`.
3. Install V5.2 and copy/mount the old `data/` directory.
4. Run `npm install` then `npm start`.
5. V5.2 upgrades schema version to 7 additively. Existing workflow `sourceDocument` and knowledge `sourceDocument` remain readable and are normalized to arrays when edited.
