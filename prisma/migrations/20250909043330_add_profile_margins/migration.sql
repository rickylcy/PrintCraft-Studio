-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PrinterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'escpos',
    "device" TEXT,
    "widthDots" INTEGER NOT NULL DEFAULT 576,
    "codepage" TEXT NOT NULL DEFAULT 'cp437',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "marginLeftDots" INTEGER NOT NULL DEFAULT 0,
    "marginRightDots" INTEGER NOT NULL DEFAULT 0,
    "marginTopDots" INTEGER NOT NULL DEFAULT 0,
    "marginBottomDots" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_PrinterProfile" ("codepage", "createdAt", "device", "id", "name", "type", "updatedAt", "widthDots") SELECT "codepage", "createdAt", "device", "id", "name", "type", "updatedAt", "widthDots" FROM "PrinterProfile";
DROP TABLE "PrinterProfile";
ALTER TABLE "new_PrinterProfile" RENAME TO "PrinterProfile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
