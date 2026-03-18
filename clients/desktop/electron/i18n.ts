export const translations: Record<string, any> = {
  zh: {
    tray: {
      open: '打开',
      quit: '退出',
    },
    notification: {
      defaultTitle: 'GetUpAI',
    },
    dialog: {
      imageFilterName: '图片',
    },
    menu: {
      app: {
        about: '关于 GetUpAI',
        services: '服务',
        hide: '隐藏 GetUpAI',
        hideOthers: '隐藏其他',
        showAll: '显示全部',
        quit: '退出 GetUpAI',
      },
      file: {
        label: '文件',
        close: '关闭窗口',
      },
      edit: {
        label: '编辑',
        undo: '撤销',
        redo: '重做',
        cut: '剪切',
        copy: '复制',
        paste: '粘贴',
        selectAll: '全选',
      },
      view: {
        label: '视图',
        reload: '重新加载',
        forceReload: '强制重新加载',
        toggleDevTools: '切换开发者工具',
        toggleFullScreen: '切换全屏',
      },
      window: {
        label: '窗口',
        minimize: '最小化',
        zoom: '缩放',
        close: '关闭',
        front: '前置所有窗口',
      },
      help: {
        label: '帮助',
        learnMore: '了解更多',
        documentation: '文档',
        community: '社区讨论',
        issues: '搜索问题',
      },
    },
  },
  en: {
    tray: {
      open: 'Open',
      quit: 'Quit',
    },
    notification: {
      defaultTitle: 'GetUpAI',
    },
    dialog: {
      imageFilterName: 'Images',
    },
    menu: {
      app: {
        about: 'About GetUpAI',
        services: 'Services',
        hide: 'Hide GetUpAI',
        hideOthers: 'Hide Others',
        showAll: 'Show All',
        quit: 'Quit GetUpAI',
      },
      file: {
        label: 'File',
        close: 'Close Window',
      },
      edit: {
        label: 'Edit',
        undo: 'Undo',
        redo: 'Redo',
        cut: 'Cut',
        copy: 'Copy',
        paste: 'Paste',
        selectAll: 'Select All',
      },
      view: {
        label: 'View',
        reload: 'Reload',
        forceReload: 'Force Reload',
        toggleDevTools: 'Toggle Developer Tools',
        toggleFullScreen: 'Toggle Full Screen',
      },
      window: {
        label: 'Window',
        minimize: 'Minimize',
        zoom: 'Zoom',
        close: 'Close',
        front: 'Bring All to Front',
      },
      help: {
        label: 'Help',
        learnMore: 'Learn More',
        documentation: 'Documentation',
        community: 'Community Discussion',
        issues: 'Search Issues',
      },
    },
  },
};

let currentLanguage = 'en';

export function setLanguage(lang: string) {
  if (lang.startsWith('zh')) {
    currentLanguage = 'zh';
  } else {
    currentLanguage = 'en';
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function t(path: string): string {
  const keys = path.split('.');
  let res = translations[currentLanguage] || translations['en'];
  for (const key of keys) {
    if (res && typeof res === 'object') {
      res = res[key];
    } else {
      res = undefined;
      break;
    }
  }
  return (res as string) || path;
}
