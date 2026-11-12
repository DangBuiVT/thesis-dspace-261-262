import { Typography, Space, Tag } from "antd";
import { DatabaseOutlined, FolderOutlined } from "@ant-design/icons";
const { Text, Link } = Typography;
export function countLabel(count, singular, plural) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

export function dspaceIdText(id) {
  if (!id) {
    return <Text type="secondary">—</Text>;
  }
  return (
    <Text code copyable={{ text: id }} style={{ fontSize: 11 }}>
      {id}
    </Text>
  );
}

export function buildDspaceTreeData(nodes, options = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }
  const translate = options.t || ((key) => key);
  const collectionsOnly = Boolean(options.selectableCollectionsOnly);
  const idSet = new Set(nodes.map((node) => node.dspaceId));
  const byParent = new Map();
  for (const node of nodes) {
    const parentKey =
      node.parentDspaceId && idSet.has(node.parentDspaceId)
        ? node.parentDspaceId
        : "__root__";
    if (!byParent.has(parentKey)) {
      byParent.set(parentKey, []);
    }
    byParent.get(parentKey).push(node);
  }

  const toNodes = (parentKey) => {
    const children = (byParent.get(parentKey) || []).slice().sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "community" ? -1 : 1;
      }
      return String(a.name).localeCompare(String(b.name), "vi");
    });
    return children.map((node) => {
      const isCollection = node.type === "collection";
      const nested = isCollection ? [] : toNodes(node.dspaceId);
      return {
        key: node.dspaceId,
        isLeaf: isCollection || nested.length === 0,
        selectable: collectionsOnly ? isCollection : true,
        nodeType: node.type,
        browseUrl: !collectionsOnly && isCollection ? node.browseUrl || "" : "",
        title: (
          <Space size={8} wrap>
            {isCollection ? <DatabaseOutlined /> : <FolderOutlined />}
            {!collectionsOnly && isCollection && node.browseUrl ? (
              <Link
                href={node.browseUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {node.name}
              </Link>
            ) : (
              <Text strong={!isCollection}>{node.name}</Text>
            )}
            <Tag color={isCollection ? "blue" : "geekblue"}>
              {isCollection ? translate("collection") : translate("community")}
            </Tag>
            {options.hideId ? null : (
              <Text type="secondary" code style={{ fontSize: 11 }}>
                {node.dspaceId}
              </Text>
            )}
          </Space>
        ),
        children: nested.length > 0 ? nested : undefined,
      };
    });
  };

  return toNodes("__root__");
}

export function collectExpandableKeys(treeNodes) {
  const keys = [];
  const walk = (items) => {
    for (const item of items || []) {
      if (item.children?.length) {
        keys.push(item.key);
        walk(item.children);
      }
    }
  };
  walk(treeNodes);
  return keys;
}
