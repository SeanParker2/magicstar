import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { AtSearchBar, AtIcon, AtTag, AtActivityIndicator } from 'taro-ui';
// import Taro from '@tarojs/taro';
import './index.scss';

// 搜索建议接口
interface SearchSuggestion {
  id: string;
  text: string;
  type: 'keyword' | 'product' | 'category';
  count?: number;
  image?: string;
}

// 搜索历史接口
interface SearchHistory {
  id: string;
  keyword: string;
  timestamp: number;
}

// 热门搜索接口
interface HotSearch {
  id: string;
  keyword: string;
  rank: number;
  isHot?: boolean;
  isNew?: boolean;
}

// 搜索结果接口
interface SearchResult {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  sales?: number;
  rating?: number;
  tags?: string[];
}

// 组件属性接口
interface ProductSearchProps {
  // 搜索框占位符
  placeholder?: string;
  // 是否显示搜索建议
  showSuggestions?: boolean;
  // 是否显示搜索历史
  showHistory?: boolean;
  // 是否显示热门搜索
  showHotSearch?: boolean;
  // 最大历史记录数
  maxHistoryCount?: number;
  // 搜索建议数据
  suggestions?: SearchSuggestion[];
  // 搜索历史数据
  history?: SearchHistory[];
  // 热门搜索数据
  hotSearch?: HotSearch[];
  // 搜索结果数据
  searchResults?: SearchResult[];
  // 加载状态
  loading?: boolean;
  // 错误信息
  error?: string;
  // 当前搜索关键词
  keyword?: string;
  // 是否显示搜索结果
  showResults?: boolean;
  // 搜索回调
  onSearch?: (keyword: string) => void;
  // 搜索建议选择回调
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  // 历史记录选择回调
  onHistorySelect?: (history: SearchHistory) => void;
  // 热门搜索选择回调
  onHotSearchSelect?: (hotSearch: HotSearch) => void;
  // 搜索结果选择回调
  onResultSelect?: (result: SearchResult) => void;
  // 清除历史记录回调
  onClearHistory?: () => void;
  // 删除历史记录回调
  onDeleteHistory?: (historyId: string) => void;
  // 搜索框值变化回调
  onInputChange?: (value: string) => void;
  // 搜索框聚焦回调
  onFocus?: () => void;
  // 搜索框失焦回调
  onBlur?: () => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  placeholder = '搜索商品',
  showSuggestions = true,
  showHistory = true,
  showHotSearch = true,
  maxHistoryCount = 10,
  suggestions = [],
  history = [],
  hotSearch = [],
  searchResults = [],
  loading = false,
  error,
  keyword = '',
  showResults = false,
  onSearch,
  onSuggestionSelect,
  onHistorySelect,
  onHotSearchSelect,
  onResultSelect,
  onClearHistory,
  onDeleteHistory,
  onInputChange,
  onFocus,
  onBlur,
}) => {
  const [inputValue, setInputValue] = useState(keyword);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionPanel, setShowSuggestionPanel] = useState(false);
  const searchBarRef = useRef<any>(null);

  // 同步外部keyword
  useEffect(() => {
    setInputValue(keyword);
  }, [keyword]);

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputValue(value);
    onInputChange?.(value);

    // 显示搜索建议
    if (value.trim() && showSuggestions) {
      setShowSuggestionPanel(true);
    } else {
      setShowSuggestionPanel(false);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    const searchKeyword = value.trim();
    if (searchKeyword) {
      setShowSuggestionPanel(false);
      onSearch?.(searchKeyword);
    }
  };

  // 处理搜索框聚焦
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();

    // 如果有输入内容且显示建议，则显示建议面板
    if (inputValue.trim() && showSuggestions) {
      setShowSuggestionPanel(true);
    }
  };

  // 处理搜索框失焦
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();

    // 延迟隐藏建议面板，以便点击建议项
    setTimeout(() => {
      setShowSuggestionPanel(false);
    }, 200);
  };

  // 处理建议选择
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.text);
    setShowSuggestionPanel(false);
    onSuggestionSelect?.(suggestion);
    onSearch?.(suggestion.text);
  };

  // 处理历史记录选择
  const handleHistorySelect = (historyItem: SearchHistory) => {
    setInputValue(historyItem.keyword);
    onHistorySelect?.(historyItem);
    onSearch?.(historyItem.keyword);
  };

  // 处理热门搜索选择
  const handleHotSearchSelect = (hotSearchItem: HotSearch) => {
    setInputValue(hotSearchItem.keyword);
    onHotSearchSelect?.(hotSearchItem);
    onSearch?.(hotSearchItem.keyword);
  };

  // 处理结果选择
  const handleResultSelect = (result: SearchResult) => {
    onResultSelect?.(result);
  };

  // 处理历史记录删除
  const handleDeleteHistory = (e: any, historyId: string) => {
    e.stopPropagation();
    onDeleteHistory?.(historyId);
  };

  // 渲染搜索建议
  const renderSuggestions = () => {
    if (!showSuggestionPanel || !showSuggestions || suggestions.length === 0) {
      return null;
    }

    return (
      <View className="search-suggestions">
        {suggestions.map(suggestion => (
          <View
            key={suggestion.id}
            className="suggestion-item"
            onClick={() => handleSuggestionSelect(suggestion)}
          >
            <View className="suggestion-content">
              <AtIcon
                value={
                  suggestion.type === 'product'
                    ? 'shopping-bag'
                    : suggestion.type === 'category'
                      ? 'bookmark'
                      : 'search'
                }
                size="16"
                color="#999"
              />
              <Text className="suggestion-text">{suggestion.text}</Text>
              {suggestion.count && (
                <Text className="suggestion-count">约{suggestion.count}个结果</Text>
              )}
            </View>
            <AtIcon value="arrow-up" size="14" color="#ccc" className="suggestion-arrow" />
          </View>
        ))}
      </View>
    );
  };

  // 渲染搜索历史
  const renderHistory = () => {
    if (!showHistory || history.length === 0 || isFocused) {
      return null;
    }

    return (
      <View className="search-history">
        <View className="history-header">
          <Text className="history-title">搜索历史</Text>
          <View className="history-clear" onClick={onClearHistory}>
            <AtIcon value="trash" size="16" color="#999" />
            <Text className="clear-text">清空</Text>
          </View>
        </View>
        <View className="history-list">
          {history.slice(0, maxHistoryCount).map(historyItem => (
            <View
              key={historyItem.id}
              className="history-item"
              onClick={() => handleHistorySelect(historyItem)}
            >
              <AtIcon value="clock" size="14" color="#ccc" />
              <Text className="history-keyword">{historyItem.keyword}</Text>
              <View
                className="history-delete"
                onClick={e => handleDeleteHistory(e, historyItem.id)}
              >
                <AtIcon value="close" size="12" color="#ccc" />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 渲染热门搜索
  const renderHotSearch = () => {
    if (!showHotSearch || hotSearch.length === 0 || isFocused) {
      return null;
    }

    return (
      <View className="hot-search">
        <View className="hot-header">
          <Text className="hot-title">热门搜索</Text>
          <AtIcon value="fire" size="16" color="#ff6b6b" />
        </View>
        <View className="hot-list">
          {hotSearch.map(hotItem => (
            <View
              key={hotItem.id}
              className="hot-item"
              onClick={() => handleHotSearchSelect(hotItem)}
            >
              <AtTag size="small" type={hotItem.rank <= 3 ? 'primary' : 'default'} circle>
                {hotItem.rank}
              </AtTag>
              <Text className="hot-keyword">{hotItem.keyword}</Text>
              {hotItem.isHot && (
                <AtTag size="small" type="primary">
                  热
                </AtTag>
              )}
              {hotItem.isNew && (
                <AtTag size="small" type="success">
                  新
                </AtTag>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 渲染搜索结果
  const renderSearchResults = () => {
    if (!showResults) {
      return null;
    }

    if (loading) {
      return (
        <View className="search-loading">
          <AtActivityIndicator mode="center" />
          <Text className="loading-text">搜索中...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="search-error">
          <AtIcon value="alert-circle" size="48" color="#f44336" />
          <Text className="error-text">{error}</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View className="search-empty">
          <AtIcon value="search" size="48" color="#ccc" />
          <Text className="empty-text">没有找到相关商品</Text>
          <Text className="empty-tip">试试其他关键词吧</Text>
        </View>
      );
    }

    return (
      <ScrollView className="search-results" scrollY>
        {searchResults.map(result => (
          <View key={result.id} className="result-item" onClick={() => handleResultSelect(result)}>
            {result.image && (
              <View className="result-image">
                <Image src={result.image} mode="aspectFill" />
              </View>
            )}
            <View className="result-info">
              <Text className="result-name">{result.name}</Text>
              {result.description && (
                <Text className="result-description">{result.description}</Text>
              )}
              <View className="result-meta">
                <View className="result-price">
                  <Text className="current-price">¥{result.price}</Text>
                  {result.originalPrice && result.originalPrice > result.price && (
                    <Text className="original-price">¥{result.originalPrice}</Text>
                  )}
                </View>
                <View className="result-stats">
                  {result.sales && <Text className="sales">已售{result.sales}</Text>}
                  {result.rating && (
                    <View className="rating">
                      <AtIcon value="star-2" size="12" color="#ffa500" />
                      <Text className="rating-text">{result.rating}</Text>
                    </View>
                  )}
                </View>
              </View>
              {result.tags && result.tags.length > 0 && (
                <View className="result-tags">
                  {result.tags.slice(0, 3).map((tag, index) => (
                    <AtTag key={index} size="small" type="default">
                      {tag}
                    </AtTag>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View className="product-search">
      <View className="search-bar-container">
        <AtSearchBar
          ref={searchBarRef}
          value={inputValue}
          placeholder={placeholder}
          onActionClick={() => handleSearch(inputValue)}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onConfirm={e => handleSearch(e.detail.value)}
          showActionButton
          actionName="搜索"
        />
      </View>

      {renderSuggestions()}

      <View className="search-content">
        {renderHistory()}
        {renderHotSearch()}
        {renderSearchResults()}
      </View>
    </View>
  );
};

export default ProductSearch;
export type { SearchSuggestion, SearchHistory, HotSearch, SearchResult, ProductSearchProps };
