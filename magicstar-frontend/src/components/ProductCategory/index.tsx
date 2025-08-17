import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { AtIcon, AtBadge, AtActivityIndicator } from 'taro-ui';
// import Taro from '@tarojs/taro';
import './index.css';

// 商品分类接口
interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  description?: string;
  productCount?: number;
  parentId?: string;
  children?: Category[];
  level: number;
  sort: number;
  isActive: boolean;
}

// 组件属性接口
interface ProductCategoryProps {
  // 显示模式：grid(网格) | list(列表) | tree(树形) | tabs(标签页)
  mode?: 'grid' | 'list' | 'tree' | 'tabs';
  // 分类数据
  categories?: Category[];
  // 当前选中的分类ID
  selectedCategoryId?: string;
  // 是否显示商品数量
  showProductCount?: boolean;
  // 是否显示图标
  showIcon?: boolean;
  // 是否显示图片
  showImage?: boolean;
  // 网格列数（仅在grid模式下有效）
  columns?: number;
  // 最大显示层级（仅在tree模式下有效）
  maxLevel?: number;
  // 是否可滚动
  scrollable?: boolean;
  // 加载状态
  loading?: boolean;
  // 错误信息
  error?: string;
  // 分类选择回调
  onCategorySelect?: (category: Category) => void;
  // 分类展开/收起回调（仅在tree模式下有效）
  onCategoryToggle?: (category: Category, expanded: boolean) => void;
}

const ProductCategory: React.FC<ProductCategoryProps> = ({
  mode = 'grid',
  categories = [],
  selectedCategoryId,
  showProductCount = true,
  showIcon = true,
  showImage = false,
  columns = 4,
  maxLevel = 3,
  scrollable = true,
  loading = false,
  error,
  onCategorySelect,
  onCategoryToggle,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('');

  // 初始化激活的标签页
  useEffect(() => {
    if (mode === 'tabs' && categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id);
    }
  }, [mode, categories, activeTab]);

  // 处理分类点击
  const handleCategoryClick = (category: Category) => {
    if (mode === 'tree' && category.children && category.children.length > 0) {
      // 树形模式下，如果有子分类，切换展开状态
      const newExpanded = new Set(expandedCategories);
      if (expandedCategories.has(category.id)) {
        newExpanded.delete(category.id);
      } else {
        newExpanded.add(category.id);
      }
      setExpandedCategories(newExpanded);
      onCategoryToggle?.(category, !expandedCategories.has(category.id));
    } else {
      // 其他模式或叶子节点，触发选择回调
      onCategorySelect?.(category);
    }
  };

  // 处理标签页切换
  const handleTabChange = (categoryId: string) => {
    setActiveTab(categoryId);
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      onCategorySelect?.(category);
    }
  };

  // 渲染分类图标
  const renderCategoryIcon = (category: Category) => {
    if (!showIcon) return null;

    if (showImage && category.image) {
      return (
        <View className="category-image">
          <Image src={category.image} mode="aspectFit" />
        </View>
      );
    }

    if (category.icon) {
      return (
        <View className="category-icon">
          <AtIcon value={category.icon} size="24" />
        </View>
      );
    }

    return (
      <View className="category-icon default">
        <AtIcon value="bookmark" size="24" />
      </View>
    );
  };

  // 渲染商品数量徽章
  const renderProductCount = (category: Category) => {
    if (!showProductCount || !category.productCount) return null;

    return (
      <AtBadge value={category.productCount} maxValue={999}>
        <View />
      </AtBadge>
    );
  };

  // 渲染网格模式
  const renderGridMode = () => {
    const gridStyle = {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
    };

    return (
      <View className="category-grid" style={gridStyle}>
        {categories.map(category => (
          <View
            key={category.id}
            className={`category-grid-item ${
              selectedCategoryId === category.id ? 'selected' : ''
            } ${!category.isActive ? 'disabled' : ''}`}
            onClick={() => category.isActive && handleCategoryClick(category)}
          >
            {renderCategoryIcon(category)}
            <Text className="category-name">{category.name}</Text>
            {renderProductCount(category)}
          </View>
        ))}
      </View>
    );
  };

  // 渲染列表模式
  const renderListMode = () => {
    return (
      <View className="category-list">
        {categories.map(category => (
          <View
            key={category.id}
            className={`category-list-item ${
              selectedCategoryId === category.id ? 'selected' : ''
            } ${!category.isActive ? 'disabled' : ''}`}
            onClick={() => category.isActive && handleCategoryClick(category)}
          >
            <View className="category-info">
              {renderCategoryIcon(category)}
              <View className="category-details">
                <Text className="category-name">{category.name}</Text>
                {category.description && (
                  <Text className="category-description">{category.description}</Text>
                )}
              </View>
            </View>
            <View className="category-extra">
              {renderProductCount(category)}
              <AtIcon value="chevron-right" size="16" color="#999" />
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 渲染树形节点
  const renderTreeNode = (category: Category, level: number = 0) => {
    if (level >= maxLevel) return null;

    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const indentStyle = { paddingLeft: `${level * 20}px` };

    return (
      <View key={category.id} className="tree-node">
        <View
          className={`tree-node-item ${
            selectedCategoryId === category.id ? 'selected' : ''
          } ${!category.isActive ? 'disabled' : ''}`}
          style={indentStyle}
          onClick={() => category.isActive && handleCategoryClick(category)}
        >
          <View className="tree-node-content">
            {hasChildren && (
              <View className="tree-expand-icon">
                <AtIcon
                  value={isExpanded ? 'chevron-down' : 'chevron-right'}
                  size="16"
                  color="#666"
                />
              </View>
            )}
            {renderCategoryIcon(category)}
            <Text className="category-name">{category.name}</Text>
          </View>
          <View className="tree-node-extra">{renderProductCount(category)}</View>
        </View>
        {hasChildren && isExpanded && (
          <View className="tree-children">
            {category.children!.map(child => renderTreeNode(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  // 渲染树形模式
  const renderTreeMode = () => {
    return (
      <View className="category-tree">{categories.map(category => renderTreeNode(category))}</View>
    );
  };

  // 渲染标签页模式
  const renderTabsMode = () => {
    const activeCategory = categories.find(cat => cat.id === activeTab);

    return (
      <View className="category-tabs">
        <ScrollView className="tabs-header" scrollX showScrollbar={false}>
          <View className="tabs-list">
            {categories.map(category => (
              <View
                key={category.id}
                className={`tab-item ${
                  activeTab === category.id ? 'active' : ''
                } ${!category.isActive ? 'disabled' : ''}`}
                onClick={() => category.isActive && handleTabChange(category.id)}
              >
                {renderCategoryIcon(category)}
                <Text className="tab-name">{category.name}</Text>
                {renderProductCount(category)}
              </View>
            ))}
          </View>
        </ScrollView>
        <View className="tabs-content">
          {activeCategory && activeCategory.children && (
            <View className="subcategory-grid">
              {activeCategory.children.map(subCategory => (
                <View
                  key={subCategory.id}
                  className={`subcategory-item ${
                    selectedCategoryId === subCategory.id ? 'selected' : ''
                  } ${!subCategory.isActive ? 'disabled' : ''}`}
                  onClick={() => subCategory.isActive && handleCategoryClick(subCategory)}
                >
                  {renderCategoryIcon(subCategory)}
                  <Text className="subcategory-name">{subCategory.name}</Text>
                  {renderProductCount(subCategory)}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <View className="category-loading">
          <AtActivityIndicator mode="center" />
          <Text className="loading-text">加载中...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="category-error">
          <AtIcon value="alert-circle" size="48" color="#f44336" />
          <Text className="error-text">{error}</Text>
        </View>
      );
    }

    if (categories.length === 0) {
      return (
        <View className="category-empty">
          <AtIcon value="folder" size="48" color="#ccc" />
          <Text className="empty-text">暂无分类</Text>
        </View>
      );
    }

    switch (mode) {
      case 'grid':
        return renderGridMode();
      case 'list':
        return renderListMode();
      case 'tree':
        return renderTreeMode();
      case 'tabs':
        return renderTabsMode();
      default:
        return renderGridMode();
    }
  };

  const containerClass = `product-category mode-${mode} ${scrollable ? 'scrollable' : ''}`;

  if (scrollable) {
    return (
      <ScrollView className={containerClass} scrollY>
        {renderContent()}
      </ScrollView>
    );
  }

  return <View className={containerClass}>{renderContent()}</View>;
};

export default ProductCategory;
export type { Category, ProductCategoryProps };
