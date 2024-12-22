// react@18.0.0
import React, { useState, useCallback, useMemo } from 'react';
// clsx@1.2.1
import clsx from 'clsx';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabChangeEvent {
  previousTabId: string | null;
  type: 'click' | 'keyboard';
  key?: string;
  target: HTMLElement;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string, event: TabChangeEvent) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
} as const;

const baseTabStyles = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors duration-200';

const Tabs: React.FC<TabsProps> = React.memo(({
  tabs,
  defaultTabId,
  onChange,
  orientation = 'horizontal',
  size = 'md',
  'aria-label': ariaLabel,
  className
}) => {
  // Find first enabled tab for default selection
  const initialTabId = useMemo(() => {
    if (defaultTabId && tabs.find(tab => tab.id === defaultTabId && !tab.disabled)) {
      return defaultTabId;
    }
    return tabs.find(tab => !tab.disabled)?.id || tabs[0]?.id;
  }, [defaultTabId, tabs]);

  const [activeTabId, setActiveTabId] = useState<string>(initialTabId);

  // Get index of currently active tab
  const activeIndex = useMemo(() => 
    tabs.findIndex(tab => tab.id === activeTabId),
    [tabs, activeTabId]
  );

  // Create a map of tab indices for keyboard navigation
  const enabledTabIndices = useMemo(() => 
    tabs.reduce<number[]>((acc, tab, index) => {
      if (!tab.disabled) acc.push(index);
      return acc;
    }, []),
    [tabs]
  );

  const handleTabChange = useCallback((
    newTabId: string,
    event: React.MouseEvent | React.KeyboardEvent,
    type: 'click' | 'keyboard'
  ) => {
    const previousTabId = activeTabId;
    setActiveTabId(newTabId);

    if (onChange) {
      const tabChangeEvent: TabChangeEvent = {
        previousTabId,
        type,
        key: 'key' in event ? event.key : undefined,
        target: event.currentTarget as HTMLElement
      };
      onChange(newTabId, tabChangeEvent);
    }
  }, [activeTabId, onChange]);

  const handleTabClick = useCallback((
    tabId: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    handleTabChange(tabId, event, 'click');
  }, [tabs, handleTabChange]);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    const currentIndex = activeIndex;
    let newIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const currentEnabledIndex = enabledTabIndices.indexOf(currentIndex);
        newIndex = enabledTabIndices[(currentEnabledIndex + 1) % enabledTabIndices.length];
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const currentEnabledIndex = enabledTabIndices.indexOf(currentIndex);
        newIndex = enabledTabIndices[(currentEnabledIndex - 1 + enabledTabIndices.length) % enabledTabIndices.length];
        break;
      }
      case 'Home': {
        event.preventDefault();
        newIndex = enabledTabIndices[0];
        break;
      }
      case 'End': {
        event.preventDefault();
        newIndex = enabledTabIndices[enabledTabIndices.length - 1];
        break;
      }
    }

    if (newIndex !== null) {
      const newTabId = tabs[newIndex].id;
      handleTabChange(newTabId, event, 'keyboard');
      // Focus the new tab button
      const newTabButton = document.querySelector(`[data-tab-id="${newTabId}"]`) as HTMLButtonElement;
      newTabButton?.focus();
    }
  }, [activeIndex, enabledTabIndices, tabs, handleTabChange]);

  const tabListClasses = clsx(
    'flex',
    {
      'border-b border-gray-200 space-x-4': orientation === 'horizontal',
      'flex-col border-r border-gray-200 space-y-2': orientation === 'vertical'
    },
    className
  );

  const tabClasses = useCallback((tabId: string, disabled?: boolean) => 
    clsx(
      baseTabStyles,
      sizeClasses[size],
      {
        'px-4 py-2': size === 'md',
        'px-3 py-1.5': size === 'sm',
        'px-6 py-3': size === 'lg',
        'text-gray-500 hover:text-gray-700': !disabled && tabId !== activeTabId,
        'text-blue-600': tabId === activeTabId,
        'opacity-50 cursor-not-allowed': disabled,
        'border-b-2 -mb-px': orientation === 'horizontal' && tabId === activeTabId,
        'border-r-2 -mr-px': orientation === 'vertical' && tabId === activeTabId,
        'border-blue-600': tabId === activeTabId
      }
    ),
    [size, activeTabId, orientation]
  );

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className="w-full">
      {/* Tab List */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={tabListClasses}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            data-tab-id={tab.id}
            aria-selected={tab.id === activeTabId}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled}
            id={`tab-${tab.id}`}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            className={tabClasses(tab.id, tab.disabled)}
            onClick={(e) => handleTabClick(tab.id, e)}
            onKeyDown={handleKeyDown}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panel */}
      {activeTab && (
        <div
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          tabIndex={0}
          className="focus:outline-none mt-4"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
});

Tabs.displayName = 'Tabs';

export default Tabs;