/**
 * usePackageBadge — returns a helper function that, given an option ID,
 * returns the package badge image path if that option belongs to the
 * currently selected package, otherwise null.
 *
 * Usage in panels:
 *   const getBadge = usePackageBadge()
 *   <OptionPill packageBadge={getBadge('spideraluminum')} ... />
 */
import { useConfigurator } from '../context/ConfiguratorContext'
import { PACKAGE_BADGES, PACKAGE_OPTION_IDS } from '../constants/packageConfigs'

export function usePackageBadge() {
  const { packageId } = useConfigurator()
  if (!packageId) return () => null

  const optionIds = PACKAGE_OPTION_IDS[packageId] ?? new Set()
  const info      = PACKAGE_BADGES[packageId]

  return (optionId) => (optionIds.has(optionId) && info?.badge ? info : null)
}
