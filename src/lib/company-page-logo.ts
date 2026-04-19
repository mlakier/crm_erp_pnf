import {
  loadCompanyInformationSettings,
  type CompanyInformationSettings,
} from '@/lib/company-information-settings-store'
import {
  loadCompanyCabinetFiles,
  type CompanyCabinetFile,
} from '@/lib/company-file-cabinet-store'

export function resolveCompanyPageLogo(
  settings: Pick<CompanyInformationSettings, 'companyLogoPagesFileId'>,
  cabinetFiles: CompanyCabinetFile[],
): CompanyCabinetFile | null {
  const selectedLogoValue = settings.companyLogoPagesFileId

  return (
    cabinetFiles.find((file) => file.id === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.originalName === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.storedName === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.url === selectedLogoValue)
    ?? (!selectedLogoValue ? cabinetFiles[0] : undefined)
    ?? null
  )
}

export async function loadCompanyPageLogo(): Promise<CompanyCabinetFile | null> {
  const [settings, cabinetFiles] = await Promise.all([
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
  ])

  return resolveCompanyPageLogo(settings, cabinetFiles)
}
