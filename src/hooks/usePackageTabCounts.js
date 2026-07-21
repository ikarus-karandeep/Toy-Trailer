import { useConfigurator } from '../context/ConfiguratorContext'
import { PACKAGE_OPTION_IDS, PACKAGE_BADGES } from '../constants/packageConfigs'

export function usePackageTabCounts() {
  const ctx = useConfigurator()
  const packageId = ctx.packageId
  
  if (!packageId) return { counts: {}, badge: null }

  const options = PACKAGE_OPTION_IDS[packageId] || new Set()
  
  const isSelected = (opt) => {
    switch(opt) {
      case 'rearwingspoiler': return ctx.exteriorAccessories === 'rearwingspoiler'
      case 'spideraluminum': return ctx.wheelType === 'spideraluminum'
      case 'blackout': return ctx.exteriorFinish === 'blackout'
      case 'dropspring': return ctx.axleSuspension === 'dropspring'
      case '7000lb': return ctx.axleCapacity === '7000lb'
      case 'drings': return ctx.tieDowns.includes('drings')
      case 'wall': return ctx.tieDowns.includes('wall')
      case 'floor': return ctx.tieDowns.includes('floor')
      case '30amp': return ctx.electrical === '30amp'
      case '5000relectric': return ctx.jacks.includes('5000relectric')
      case 'vnosebase': return ctx.cabinets.includes('vnosebase')
      case 'wallrun36': return ctx.cabinets.includes('wallrun36')
      case 'wallrun16': return ctx.cabinets.includes('wallrun16')
      case '50amp': return ctx.electrical === '50amp'
      case '18kminisplit': return ctx.climateControl === '18kminisplit'
      case 'white_metal_walls': return ctx.walls === 'white_metal_walls'
      case 'white_metal_ceiling': return ctx.ceiling === 'white_metal_ceiling'
      default: return false
    }
  }

  const getTab = (opt) => {
    switch(opt) {
      case 'rearwingspoiler':
      case 'spideraluminum':
      case 'blackout': return 'EXTERIOR'
      
      case 'dropspring':
      case '7000lb': return 'SIZE & CAPACITY'
      
      case 'drings':
      case 'wall':
      case 'floor':
      case '5000relectric': return 'LOADING'
      
      case '30amp':
      case '50amp':
      case '18kminisplit': return 'SYSTEMS'
      
      case 'vnosebase':
      case 'wallrun36':
      case 'wallrun16':
      case 'white_metal_walls':
      case 'white_metal_ceiling': return 'INTERIOR'
      
      default: return null
    }
  }

  const counts = {}
  for (const opt of options) {
    if (isSelected(opt)) {
      const tab = getTab(opt)
      if (tab) {
        counts[tab] = (counts[tab] || 0) + 1
      }
    }
  }

  return { counts, badge: PACKAGE_BADGES[packageId]?.badge }
}
