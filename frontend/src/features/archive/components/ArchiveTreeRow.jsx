import { DownOutlined, RightOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
const { Text } = Typography;
export function ArchiveTreeRow({
  depth,
  expanded,
  expandable,
  onToggle,
  icon,
  title,
  extra,
  actions,
  style,
  stacked = false,
}) {
  return (
    <div
      className="archive-tree-row"
      onClick={expandable ? onToggle : undefined}
      style={{
        display: "flex",
        alignItems: stacked ? "flex-start" : "center",
        gap: 8,
        minHeight: depth === 0 ? 52 : 44,
        padding: depth === 0 ? "8px 14px" : "8px 14px",
        paddingLeft: 12 + depth * 22,
        cursor: expandable ? "pointer" : "default",
        ...style,
      }}
    >
      <span
        style={{
          width: 16,
          color: "#8aa0b8",
          display: "inline-flex",
          justifyContent: "center",
          flex: "0 0 16px",
        }}
      >
        {expandable ? (
          expanded ? (
            <DownOutlined style={{ fontSize: 11 }} />
          ) : (
            <RightOutlined style={{ fontSize: 11 }} />
          )
        ) : null}
      </span>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 28px",
          background:
            depth === 0 ? "#e8f4fc" : depth === 1 ? "#eef3fb" : "#f3f5f8",
          color: depth === 0 ? "#1488D8" : depth === 1 ? "#2f5f93" : "#6d7f93",
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space size={6} wrap>
          <Text strong={depth < 2} style={{ fontSize: depth === 0 ? 15 : 14 }}>
            {title}
          </Text>
          {stacked ? null : extra}
        </Space>
        {stacked ? (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {extra}
          </div>
        ) : null}
      </div>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ flex: "0 0 auto" }}
      >
        {actions}
      </div>
    </div>
  );
}
