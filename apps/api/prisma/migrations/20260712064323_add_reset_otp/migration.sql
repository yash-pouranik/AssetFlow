-- AlterTable
ALTER TABLE `users` ADD COLUMN `resetPasswordExpires` DATETIME(3) NULL,
    ADD COLUMN `resetPasswordOtp` VARCHAR(191) NULL;
