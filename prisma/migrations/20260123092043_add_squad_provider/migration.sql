-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'SQUAD';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'APPLICANT';

-- AlterTable
ALTER TABLE "ContentAsset" ADD COLUMN     "curriculumItemId" TEXT;

-- AlterTable
ALTER TABLE "CurriculumItem" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "topics" TEXT[];

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_curriculumItemId_fkey" FOREIGN KEY ("curriculumItemId") REFERENCES "CurriculumItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
