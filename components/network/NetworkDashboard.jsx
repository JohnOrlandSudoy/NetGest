import InterfaceTooltip from '@/components/common/InterfaceTooltip';

// Add this where you display the selected interface
<div className="flex items-center mb-4">
  <span className="text-gray-600 mr-2">Selected Interface:</span>
  <InterfaceTooltip interfaceName={selectedInterface}>
    <span className="font-medium text-blue-600 cursor-help border-b border-dotted border-blue-300">
      {selectedInterface}
    </span>
  </InterfaceTooltip>
</div>