import "./ConfigList.css";

interface ConfigListProps {
  configs: unknown[];
  onSelectConfig: (index: number) => void;
  onAddConfig: () => void;
}

export function ConfigList({
  configs,
  onSelectConfig,
  onAddConfig,
}: ConfigListProps) {
  const getConfigLabel = (config: unknown, index: number): string => {
    if (typeof config === "object" && config !== null) {
      const obj = config as Record<string, unknown>;
      // Try to find a meaningful label
      if (obj.path && typeof obj.path === "string") {
        return `Config ${index + 1} (${obj.path})`;
      }
      if (obj.layouts && Array.isArray(obj.layouts) && obj.layouts.length > 0) {
        const firstLayout = obj.layouts[0] as Record<string, unknown>;
        if (firstLayout.layoutName && typeof firstLayout.layoutName === "string") {
          return `Config ${index + 1} (${firstLayout.layoutName})`;
        }
      }
    }
    return `Config ${index + 1}`;
  };

  return (
    <div className="config-list">
      <div className="config-list-header">
        <h2>Configurations</h2>
        <button onClick={onAddConfig} className="add-button">
          + Add Config
        </button>
      </div>
      <div className="config-list-items">
        {configs.length === 0 ? (
          <div className="config-list-empty">
            <p>No configurations found. Click "Add Config" to create one.</p>
          </div>
        ) : (
          configs.map((config, index) => (
            <div
              key={index}
              className="config-list-item"
              onClick={() => onSelectConfig(index)}
            >
              <div className="config-list-item-content">
                <span className="config-list-item-label">
                  {getConfigLabel(config, index)}
                </span>
                <span className="config-list-item-arrow">→</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}




