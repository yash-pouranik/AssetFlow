-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_targetDeptId_fkey` FOREIGN KEY (`targetDeptId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
