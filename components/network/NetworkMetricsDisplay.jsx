import OfflineSafeTooltip from '@/components/common/OfflineSafeTooltip';

// Replace InterfaceTooltip with OfflineSafeTooltip
<OfflineSafeTooltip interfaceName={metric.interface_name}>
  <span className="font-medium cursor-help border-b border-dotted border-gray-400">
    {metric.interface_name}
  </span>
</OfflineSafeTooltip>