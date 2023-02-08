import * as vscode from 'vscode';
import * as path from 'path';
import {
  DecorationInstanceRenderOptions,
  DecorationOptions,
  TextEditorDecorationType,
  window,
  DecorationRangeBehavior,
  DecorationRenderOptions,
  Range
} from 'vscode';
import * as _ from 'lodash';
import {getPackageJson} from '../util/utils';
var fs = require("fs");
const annotationDecoration: TextEditorDecorationType = window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 0em',
    textDecoration: 'none'
  },
  rangeBehavior: DecorationRangeBehavior.ClosedOpen
} as DecorationRenderOptions);

export function transformPosition(pos: Position, editorText: string, toLastCol?: boolean) {
  const { start, code } = pos;

  const width = code.length;
  let lines, line, ch;
  if (start !== undefined) {
    lines = editorText.slice(0, start + 1).split('\n');
    /** 当前所在行 */
    line = (pos as any).line || lines.length - 1;
    /** I18N 开始的 col */
    ch = lines[line].length;
  } else {
    lines = editorText.split('\n');
    line = (pos as any).line;
    ch = lines[line].length;
  }

  let first, last;
  if (toLastCol) {
    const lineLastCol = _.get(editorText.split('\n'), [line, 'length']);
    first = new vscode.Position(line, lineLastCol);
    last = new vscode.Position(line, width + lineLastCol);
  } else {
    first = new vscode.Position(line, ch);
    last = new vscode.Position(line, ch + width);
  }
  return new Range(first, last);
}
export const addi18n = function (treeProvider) {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) {return;}
  let decorations = [];
  // console.log();
  if(config.inline=='true') {
    let packageName = getPackageJson(window.activeTextEditor.document.fileName, config.rootwork, vscode.workspace.workspaceFolders[0].uri.fsPath);
    decorations = treeProvider.enumFolder(activeEditor.document.fileName, true,activeEditor.document).map(item=>{
      let range=new Range(new vscode.Position(item.position.vsPosStrat.line,item.position.vsPosStrat.character),new vscode.Position(item.position.vsPosEnd.line,item.position.vsPosEnd.character));
      return {
        range,
        renderOptions: {
          after: {
            color: '#999999',
            contentText: `🔧   ${langmap[packageName]? langmap[packageName][item.label]:langmap['AllIn'][item.label] ||"未翻译词条"} 🔧`,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none;'
          }
        } as DecorationInstanceRenderOptions
      } as DecorationOptions;
    });
  } else {
    let code = activeEditor.document.getText();
    const positions = getRegexMatches({}, code);
    decorations = (positions || []).map(pos => {
      const toLastCol = true;
      const range = transformPosition(pos, code, false);
      return {
        range,
        renderOptions: {
          after: {
            color: '#999999',
            contentText: `🐤  ${pos.cn.replace('\n', ' \\n')} 🐤`,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none;'
          }
        } as DecorationInstanceRenderOptions
      } as DecorationOptions;
    });
  }

  activeEditor.setDecorations(annotationDecoration, decorations);
};
export class Position {
  start: number;
  cn: string;
  code: string;
}

function getRegexMatches(I18N, code: string) {
  const lines = code.split('\n');
  const positions: Position[] = [];
  /** 匹配$t() */
  try {

    (lines || []).map((line, index) => {
      let reg = /\$t\((.+?)\)/gi;
      let reg1 = /'(.+?)'/g;
      let reg2 = /"(.+?)"/g;
      let linearr = line.match(reg);
      if (!linearr) {return;}
      linearr.forEach(item => {
        let position = new Position();
        let textcode = item.split(',')[0];
        let exc1 = textcode.match(reg1);
        let exc2 = textcode.match(reg2);
        if (exc1) {

          position.code = exc1[0].substring(1, exc1[0].length - 1);
        } else {
          position.code = exc2[0].substring(1, exc2[0].length - 1);
        }
        (position as any).line = index;
        if (global.langtype === 'string') {
          position.cn = global.langmap[position.code];
        } else {
          let mainArr = [];
          try {
            let folders = fs.readdirSync(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, config.rootwork));
            folders.forEach(item => {
              let packages = JSON.parse(fs.readFileSync(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, config.rootwork,item,'package.json'), 'utf-8'));
              mainArr.push(packages.name);
            });
          } catch (error) {
              console.log("读取根文件夹报错 可能出现了空的文件夹");
          }
          let map = {};
        let isInclude = mainArr.some(item => {
          let packageName = getPackageJson(window.activeTextEditor.document.fileName, config.rootwork, vscode.workspace.workspaceFolders[0].uri.fsPath);
          if(global.langmap[packageName]) {
            map = global.langmap[item];
            return true;
          }
        });
        if (!isInclude) {
          map = global.langmap.AllIn;
        }
          // let map = {};
          // let isInclude = mainArr.some(item => {
          //   if(window.activeTextEditor.document.fileName.indexOf(`/${item}/`)!== -1) {
          //     map = global.langmap[item];
          //     return true;
          //   }
          // });
          // if (!isInclude) {
          //   map = global.langmap.AllIn;
          // }
      
          position.cn = map[position.code];
        }
       
        if (position.cn) {

          positions.push(position);
        }
      });
    });
  } catch (error) {
    console.log(error);
  }

  return positions;
}