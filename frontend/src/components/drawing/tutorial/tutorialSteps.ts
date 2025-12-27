import { ToolType } from '../types'

export interface TutorialStep {
  id: string
  title: string
  description: string
  instructions: string[]
  tips?: string[]
  targetTool?: ToolType
  highlightElements?: string[] // CSS selectors to highlight
}

export interface TutorialChapter {
  id: string
  title: string
  description: string
  steps: TutorialStep[]
}

export const tutorialChapters: TutorialChapter[] = [
  {
    id: 'canvas-basics',
    title: 'キャンバス操作',
    description: 'ズーム、パン、グリッド、ルーラーの基本操作を学びます',
    steps: [
      {
        id: 'zoom',
        title: 'ズーム操作',
        description: 'キャンバスを拡大・縮小する方法を学びます。',
        instructions: [
          'マウスホイールを上下に回して、キャンバスを拡大・縮小してみましょう',
          '右下のズームコントロールでも操作できます',
          '「100%」ボタンでリセットできます',
        ],
        tips: [
          '細かい作業は拡大して、全体確認は縮小して行うと効率的です',
          'Ctrl++ でズームイン、Ctrl+- でズームアウト',
          'Ctrl+0 でズームをリセット',
        ],
      },
      {
        id: 'pan',
        title: 'パン（移動）操作',
        description: 'キャンバスを移動する方法を学びます。',
        instructions: [
          'Spaceキーを押しながらドラッグで、キャンバスを移動できます',
          '選択ツール以外のときも同様に操作できます',
        ],
        tips: ['大きな図面では、パン操作を活用して作業領域を移動しましょう'],
      },
      {
        id: 'grid',
        title: 'グリッド表示',
        description: 'グリッドを表示して、図形を揃えやすくします。',
        instructions: [
          'ツールバーの「グリッド」ボタン（G）をクリックしてグリッドを表示',
          '「グリッドスナップ」を有効にすると、図形がグリッドに吸着します',
        ],
        tips: ['精密な配置が必要な場合はグリッドスナップを活用しましょう'],
        highlightElements: ['.grid-toggle', '.snap-toggle'],
      },
      {
        id: 'ruler',
        title: 'ルーラー表示',
        description: 'ルーラーを表示して、位置を正確に把握します。',
        instructions: [
          'ツールバーの「ルーラー」ボタンをクリックしてルーラーを表示/非表示',
          'ルーラーにはマウス位置が表示されます',
          'ズームに合わせて目盛りが自動調整されます',
        ],
        tips: ['正確な位置決めが必要な場合はルーラーを活用しましょう'],
      },
    ],
  },
  {
    id: 'basic-shapes',
    title: '基本図形を描く',
    description: '線、矩形、円の描き方を学びます',
    steps: [
      {
        id: 'line',
        title: '線を描く',
        description: '直線を描く方法を学びます。',
        instructions: [
          'ツールバーから「線」ツール（L）を選択',
          'キャンバス上でクリックして始点を決定',
          'ドラッグして終点でマウスを離す',
        ],
        tips: [
          'Shiftキーを押しながら描くと、水平・垂直・45度の線が描けます',
          'ステータスバーに長さが表示されます',
        ],
        targetTool: 'line',
      },
      {
        id: 'rect',
        title: '矩形を描く',
        description: '四角形を描く方法を学びます。',
        instructions: [
          'ツールバーから「矩形」ツール（R）を選択',
          'キャンバス上でクリックして角を決定',
          'ドラッグして対角でマウスを離す',
        ],
        tips: [
          'Shiftキーを押しながら描くと、正方形が描けます',
          'プロパティパネルで角丸（コーナー半径）を設定できます',
        ],
        targetTool: 'rect',
      },
      {
        id: 'circle',
        title: '円を描く',
        description: '円を描く方法を学びます。',
        instructions: [
          'ツールバーから「円」ツール（C）を選択',
          'キャンバス上でクリックして中心を決定',
          'ドラッグして半径を決めてマウスを離す',
        ],
        tips: ['ステータスバーに半径が表示されます'],
        targetTool: 'circle',
      },
    ],
  },
  {
    id: 'advanced-shapes',
    title: '応用図形を描く',
    description: '円弧、多角形、矢印、フリーハンドの描き方を学びます',
    steps: [
      {
        id: 'arc',
        title: '円弧を描く',
        description: '円弧（アーク）を描く方法を学びます。',
        instructions: [
          'ツールバーから「円弧」ツール（A）を選択',
          '最初のクリックで中心を決定',
          '2回目のクリックで開始角度を決定',
          '3回目のクリックで終了角度を決定',
        ],
        tips: ['扇形や部分的な円を描くときに使用します'],
        targetTool: 'arc',
      },
      {
        id: 'polygon',
        title: '多角形を描く',
        description: '自由な形の多角形を描く方法を学びます。',
        instructions: [
          'ツールバーから「多角形」ツール（P）を選択',
          'クリックで頂点を追加していく',
          'ダブルクリックで図形を完成',
        ],
        tips: [
          '三角形、五角形など自由な形が作れます',
          'Escキーで描画をキャンセルできます',
        ],
        targetTool: 'polygon',
      },
      {
        id: 'arrow',
        title: '矢印を描く',
        description: '矢印を描く方法を学びます。',
        instructions: [
          'ツールバーから「矢印」ツール（W）を選択',
          'ドラッグで矢印を描画',
          '矢印の先端は終点側に付きます',
        ],
        tips: [
          'Shiftキーで水平・垂直・45度の矢印が描けます',
          '説明図やフローチャートに便利です',
        ],
        targetTool: 'arrow',
      },
      {
        id: 'freehand',
        title: 'フリーハンドで描く',
        description: '自由な線を描く方法を学びます。',
        instructions: [
          'ツールバーから「フリーハンド」ツール（F）を選択',
          'マウスをドラッグして自由に描画',
          'マウスを離すと描画完了',
        ],
        tips: ['手書きの注釈やスケッチに便利です'],
        targetTool: 'freehand',
      },
    ],
  },
  {
    id: 'text',
    title: 'テキストを追加',
    description: 'テキストを追加する方法を学びます',
    steps: [
      {
        id: 'add-text',
        title: 'テキストを追加',
        description: '図面にテキストを追加します。',
        instructions: [
          'ツールバーから「テキスト」ツール（T）を選択',
          'キャンバス上でクリック',
          '表示されるダイアログにテキストを入力',
          'OKボタンで確定',
        ],
        tips: ['ラベルや注釈を追加するのに使います'],
        targetTool: 'text',
      },
      {
        id: 'edit-text',
        title: 'テキストを編集',
        description: '既存のテキストを編集します。',
        instructions: [
          '選択ツール（V）でテキストをダブルクリック',
          '編集ダイアログが表示されます',
          '内容を変更してOKで確定',
        ],
        tips: ['プロパティパネルでフォントサイズも変更できます'],
        targetTool: 'select',
      },
    ],
  },
  {
    id: 'image-insert',
    title: '画像の挿入',
    description: '画像ファイルをキャンバスに挿入する方法を学びます',
    steps: [
      {
        id: 'insert-image',
        title: '画像を挿入する',
        description: '画像ファイルをキャンバスに追加します。',
        instructions: [
          'ツールバーの「画像を挿入」ボタン（Ctrl+I）をクリック',
          'ファイル選択ダイアログで画像を選択',
          '画像がキャンバス中央に配置されます',
        ],
        tips: [
          'PNG、JPEG、GIF、SVGなどの画像形式に対応',
          '大きな画像は自動的に500px以下にリサイズされます',
        ],
      },
      {
        id: 'edit-image',
        title: '画像を編集する',
        description: '挿入した画像のサイズや位置を調整します。',
        instructions: [
          '選択ツールで画像を選択',
          'ハンドルをドラッグしてサイズを変更',
          'ドラッグで位置を移動',
        ],
        tips: [
          'Shiftキーを押しながらリサイズでアスペクト比を維持',
          'プロパティパネルで正確なサイズを数値指定可能',
        ],
        targetTool: 'select',
      },
    ],
  },
  {
    id: 'select-transform',
    title: '選択と移動',
    description: '図形の選択、移動、複製を学びます',
    steps: [
      {
        id: 'select',
        title: '図形を選択',
        description: '図形を選択する方法を学びます。',
        instructions: [
          'ツールバーから「選択」ツール（V）を選択',
          '図形をクリックして選択',
          'Shiftキーを押しながらクリックで複数選択',
          '空白部分からドラッグで範囲選択',
        ],
        tips: [
          'Ctrl+A で全選択できます',
          'Escキーで選択を解除できます',
        ],
        targetTool: 'select',
      },
      {
        id: 'move',
        title: '図形を移動',
        description: '選択した図形を移動します。',
        instructions: [
          '図形を選択した状態でドラッグ',
          'ドラッグ中にスマートガイドが表示されます',
          '他の図形に揃えやすくなります',
        ],
        tips: [
          '矢印キーでも1pxずつ移動できます',
          'プロパティパネルでX/Y座標を直接入力可能',
        ],
        targetTool: 'select',
      },
      {
        id: 'duplicate',
        title: '図形を複製',
        description: '選択した図形を複製します。',
        instructions: [
          '図形を選択',
          'Ctrl+D で複製',
          '複製された図形は少しずれた位置に配置されます',
        ],
        tips: [
          'Ctrl+C → Ctrl+V でもコピー＆ペーストできます',
          'Ctrl+X でカット（切り取り）',
        ],
        targetTool: 'select',
      },
      {
        id: 'delete',
        title: '図形を削除',
        description: '選択した図形を削除します。',
        instructions: [
          '図形を選択',
          'Deleteキーまたはツールバーの削除ボタンで削除',
          '「すべてクリア」で全図形を削除',
        ],
        tips: [
          'Ctrl+Z で削除を元に戻せます',
          'Backspaceキーでも削除できます',
        ],
        targetTool: 'select',
      },
    ],
  },
  {
    id: 'resize-rotate',
    title: 'リサイズと変形',
    description: '図形のサイズ変更、回転、反転を学びます',
    steps: [
      {
        id: 'resize',
        title: 'リサイズ',
        description: '図形のサイズを変更します。',
        instructions: [
          '選択した図形の周りにハンドルが表示されます',
          '角のハンドルをドラッグでリサイズ',
          'サイドのハンドルで幅または高さのみ変更',
        ],
        tips: [
          'Shiftキーでアスペクト比を維持してリサイズ',
          'プロパティパネルでW/Hを数値指定可能',
        ],
        targetTool: 'select',
      },
      {
        id: 'rotate',
        title: '回転',
        description: '図形を回転します。',
        instructions: [
          '選択した図形の上部に回転ハンドルが表示されます',
          '回転ハンドルをドラッグで回転',
          'プロパティパネルで角度を数値入力',
        ],
        tips: [
          'Shiftキーで15度単位でスナップ',
          '0度、90度、180度、270度に正確に設定可能',
        ],
        targetTool: 'select',
      },
      {
        id: 'flip',
        title: '反転',
        description: '図形を水平・垂直に反転します。',
        instructions: [
          '図形を選択',
          'ツールバーの「水平反転」（H）で左右反転',
          'ツールバーの「垂直反転」（J）で上下反転',
        ],
        tips: ['対称な図形を作成する際に便利です'],
        targetTool: 'select',
      },
    ],
  },
  {
    id: 'styling',
    title: 'スタイル設定',
    description: '図形の色や線のスタイルを変更します',
    steps: [
      {
        id: 'stroke-color',
        title: '線の色を変更',
        description: '線の色を変更します。',
        instructions: [
          '図形を選択',
          'サイドバーのスタイルパネルを開く',
          '「線色」から色を選択',
          'プリセットから選ぶか、カスタム色を指定',
        ],
        tips: ['選択せずに変更すると、新規図形のデフォルト色になります'],
        highlightElements: ['.style-panel'],
      },
      {
        id: 'stroke-width',
        title: '線の太さを変更',
        description: '線の太さを変更します。',
        instructions: [
          '図形を選択',
          '「線幅」のドロップダウンから選択',
          '1px〜20pxの範囲で設定可能',
        ],
        tips: ['細い線は精密な図面に、太い線は強調に使用'],
      },
      {
        id: 'fill-color',
        title: '塗りつぶし色を設定',
        description: '図形の内部を塗りつぶします。',
        instructions: [
          '図形を選択（矩形、円、多角形など）',
          '「塗り色」から色を選択',
          '「なし」を選ぶと塗りなしになります',
        ],
        tips: ['線と円弧には塗りが適用されません'],
      },
      {
        id: 'line-style',
        title: '線種を変更',
        description: '実線、破線、点線などを設定します。',
        instructions: [
          '図形を選択',
          '「線種」から種類を選択',
          '実線、破線、点線、一点鎖線が選べます',
        ],
        tips: ['破線は隠れ線、一点鎖線は中心線によく使われます'],
      },
    ],
  },
  {
    id: 'layers',
    title: 'レイヤー操作',
    description: 'レイヤーパネルで図形を管理します',
    steps: [
      {
        id: 'layer-panel',
        title: 'レイヤーパネルの使い方',
        description: 'レイヤーパネルで図形一覧を確認します。',
        instructions: [
          'サイドバーの「レイヤー」パネルを確認',
          '図形がリスト表示されます',
          'クリックで図形を選択',
        ],
        tips: ['図形の重なり順がわかります'],
      },
      {
        id: 'visibility',
        title: '表示/非表示の切り替え',
        description: '図形の表示・非表示を切り替えます。',
        instructions: [
          'レイヤーパネルで図形を探す',
          '目のアイコンをクリックして表示/非表示を切り替え',
          '非表示の図形は選択できなくなります',
        ],
        tips: ['複雑な図面で一時的に邪魔な図形を隠すときに便利'],
      },
      {
        id: 'lock',
        title: 'ロックの切り替え',
        description: '図形をロックして編集を防止します。',
        instructions: [
          'レイヤーパネルで図形を探す',
          '鍵アイコンをクリックしてロック/解除',
          'ロックされた図形は選択・移動できません',
        ],
        tips: ['背景画像など、動かしたくない図形をロックしましょう'],
      },
      {
        id: 'z-order',
        title: '重なり順を変更',
        description: '図形の前後関係を変更します。',
        instructions: [
          '図形を選択',
          'ツールバーのZ-Orderボタンを使用',
          '「最前面へ」「前面へ」「背面へ」「最背面へ」',
        ],
        tips: ['レイヤーパネルでのドラッグでも順序を変更できます'],
      },
    ],
  },
  {
    id: 'align-distribute',
    title: '整列と配置',
    description: '複数の図形を整列・均等配置します',
    steps: [
      {
        id: 'align',
        title: '図形を整列',
        description: '複数の図形を揃えます。',
        instructions: [
          '複数の図形を選択（Shift+クリック）',
          'ツールバーの整列ボタンを使用',
          '左揃え、中央揃え、右揃えなど',
          '上揃え、中央揃え、下揃えなど',
        ],
        tips: ['2つ以上の図形を選択すると使用可能になります'],
        highlightElements: ['.align-buttons'],
      },
      {
        id: 'distribute',
        title: '均等配置',
        description: '図形を均等に配置します。',
        instructions: [
          '3つ以上の図形を選択',
          '「水平方向に均等配置」または「垂直方向に均等配置」を選択',
          '図形が等間隔に配置されます',
        ],
        tips: ['メニューやボタンを等間隔に配置するときに便利'],
      },
    ],
  },
  {
    id: 'grouping',
    title: 'グループ化',
    description: '複数の図形をグループとしてまとめます',
    steps: [
      {
        id: 'group',
        title: 'グループ化',
        description: '複数の図形をグループ化します。',
        instructions: [
          '複数の図形を選択',
          'Ctrl+G でグループ化',
          'グループは1つの図形として移動・変形できます',
        ],
        tips: [
          '複雑な図形を1つにまとめて管理できます',
          'グループ内の図形の相対位置が維持されます',
        ],
      },
      {
        id: 'ungroup',
        title: 'グループ解除',
        description: 'グループを解除します。',
        instructions: [
          'グループを選択',
          'Ctrl+Shift+G でグループ解除',
          '個々の図形として編集可能になります',
        ],
        tips: ['グループ内の一部を編集したいときに使用'],
      },
    ],
  },
  {
    id: 'snap-guides',
    title: 'スナップ機能',
    description: 'グリッドスナップ、オブジェクトスナップ、スマートガイドを学びます',
    steps: [
      {
        id: 'grid-snap',
        title: 'グリッドスナップ',
        description: 'グリッドに図形を吸着させます。',
        instructions: [
          'ツールバーの「グリッドスナップ」ボタンを有効化',
          '図形を描画・移動するとグリッドに吸着',
          '正確な位置に配置しやすくなります',
        ],
        tips: ['グリッドサイズは20px単位です'],
      },
      {
        id: 'object-snap',
        title: 'オブジェクトスナップ',
        description: '他の図形の端点や中心点にスナップします。',
        instructions: [
          'ツールバーの「オブジェクトスナップ」ボタンを有効化',
          '図形を描画・移動すると他の図形の特徴点に吸着',
          '端点、中点、中心点などにスナップ',
        ],
        tips: ['図形同士を正確に接続するときに便利'],
      },
      {
        id: 'smart-guides',
        title: 'スマートガイド',
        description: '移動時に自動的に表示されるガイドラインです。',
        instructions: [
          '図形を選択してドラッグ',
          '他の図形と揃う位置でガイドラインが表示',
          'ガイドラインに沿って配置できます',
        ],
        tips: ['水平・垂直の整列、等間隔の配置に役立ちます'],
      },
    ],
  },
  {
    id: 'property-panel',
    title: 'プロパティパネル',
    description: 'プロパティパネルで図形を正確に編集します',
    steps: [
      {
        id: 'position',
        title: '位置の数値入力',
        description: '図形の位置を正確に指定します。',
        instructions: [
          '図形を選択',
          'サイドバーの「プロパティ」パネルを確認',
          'X、Y座標を数値で入力',
          'Enterキーで確定',
        ],
        tips: ['マウスでは難しい正確な位置指定が可能'],
      },
      {
        id: 'size',
        title: 'サイズの数値入力',
        description: '図形のサイズを正確に指定します。',
        instructions: [
          '図形を選択',
          'W（幅）、H（高さ）を数値で入力',
          'Enterキーで確定',
        ],
        tips: ['正確なサイズの図形を作成できます'],
      },
      {
        id: 'rotation',
        title: '回転角度の入力',
        description: '図形の回転角度を正確に指定します。',
        instructions: [
          '図形を選択',
          '「回転」の角度を数値で入力',
          '0〜360度の範囲で指定',
        ],
        tips: ['45度、90度などの正確な角度に設定可能'],
      },
      {
        id: 'shape-specific',
        title: '図形固有のプロパティ',
        description: '図形タイプごとの特別なプロパティを編集します。',
        instructions: [
          '矩形：角丸（コーナー半径）を設定',
          '円：半径を設定',
          'テキスト：フォントサイズを設定',
        ],
        tips: ['図形タイプによって表示されるプロパティが変わります'],
      },
    ],
  },
  {
    id: 'coordinate-drawing',
    title: '座標入力による描画',
    description: '座標を指定して正確な位置・サイズで図形を描画します',
    steps: [
      {
        id: 'coordinate-workflow',
        title: '座標入力の基本ワークフロー',
        description: '座標を使った精密描画の流れを学びます。',
        instructions: [
          'まず図形ツールで大まかに図形を描く',
          '描いた図形を選択',
          'プロパティパネルで正確な座標・サイズを入力',
          'Enterキーで確定',
        ],
        tips: [
          '先に描いてから座標調整するのが基本ワークフロー',
          '技術図面やレイアウト作業に最適',
        ],
        targetTool: 'select',
      },
      {
        id: 'precise-position',
        title: '指定位置に図形を配置',
        description: '特定の座標に図形を配置します。',
        instructions: [
          '矩形ツール（R）で適当な位置に矩形を描く',
          '選択ツール（V）で矩形を選択',
          'プロパティパネルの X に「100」を入力',
          'プロパティパネルの Y に「100」を入力',
          '矩形が (100, 100) の位置に移動',
        ],
        tips: [
          '左上が原点 (0, 0) です',
          'X は右方向、Y は下方向に増加',
        ],
        targetTool: 'rect',
      },
      {
        id: 'precise-size',
        title: '指定サイズで図形を作成',
        description: '特定のサイズの図形を作成します。',
        instructions: [
          '円ツール（C）で適当なサイズの円を描く',
          '選択ツール（V）で円を選択',
          'プロパティパネルで半径を「50」に設定',
          '直径100pxの円ができる',
        ],
        tips: [
          '矩形は W（幅）と H（高さ）で指定',
          '円は半径で指定',
        ],
        targetTool: 'circle',
      },
      {
        id: 'grid-coordinate',
        title: 'グリッドと座標の併用',
        description: 'グリッドスナップと座標入力を組み合わせます。',
        instructions: [
          'グリッドスナップを有効化',
          '図形を描くとグリッド（20px単位）に吸着',
          '必要に応じて座標入力で微調整',
          '例: X=100, Y=80 など20の倍数以外の値',
        ],
        tips: [
          'グリッドで大まかに配置→座標で微調整が効率的',
          'グリッドサイズは20px',
        ],
      },
      {
        id: 'duplicate-offset',
        title: '複製と座標オフセット',
        description: '複製して座標をずらして配置します。',
        instructions: [
          '図形を選択して Ctrl+D で複製',
          '複製した図形の X 座標に +100 を加える',
          '同じ高さで100px右に配置される',
          '繰り返して等間隔に配置',
        ],
        tips: [
          '計算して入力: 元が X=50 なら複製は X=150',
          '正確な等間隔配置ができる',
        ],
        targetTool: 'select',
      },
      {
        id: 'center-alignment',
        title: '中央配置の計算',
        description: 'キャンバス中央に図形を配置します。',
        instructions: [
          '幅200pxの矩形をキャンバス幅800pxの中央に配置',
          'X = (800 - 200) / 2 = 300',
          'プロパティパネルに X=300 を入力',
          'Y も同様に計算して入力',
        ],
        tips: [
          '中央配置の公式: (キャンバス幅 - 図形幅) / 2',
          '複数選択して整列機能を使う方法もあります',
        ],
        targetTool: 'select',
      },
    ],
  },
  {
    id: 'technical-drawing',
    title: '技術図面の描き方',
    description: '寸法線と座標を使った技術図面の作成方法',
    steps: [
      {
        id: 'drawing-plan',
        title: '図面の計画',
        description: '描画前に寸法を計画します。',
        instructions: [
          '作成したい図形のサイズを決める（例: 200×150の矩形）',
          '配置位置を決める（例: X=100, Y=100）',
          'グリッドスナップを有効にする',
          'ルーラーを表示する',
        ],
        tips: ['事前に寸法を決めておくと効率的です'],
      },
      {
        id: 'base-shape',
        title: '基準図形の作成',
        description: '基準となる図形を正確なサイズで作成します。',
        instructions: [
          '矩形ツール（R）で矩形を描く',
          'プロパティパネルで位置を設定: X=100, Y=100',
          'サイズを設定: W=200, H=150',
          'これが基準図形になる',
        ],
        tips: ['最初の図形を正確に配置することが重要'],
        targetTool: 'rect',
      },
      {
        id: 'relative-position',
        title: '相対位置での配置',
        description: '基準図形を基準に他の図形を配置します。',
        instructions: [
          '円を描いて選択',
          '基準矩形の右端に配置: X = 100 + 200 = 300',
          '基準矩形の中央の高さ: Y = 100 + 75 = 175',
          '円の中心が矩形の右端中央に配置される',
        ],
        tips: [
          '基準位置 + オフセット で計算',
          'オブジェクトスナップを使う方法もあります',
        ],
        targetTool: 'circle',
      },
      {
        id: 'add-dimensions',
        title: '寸法線の追加',
        description: '図形に寸法線を追加して完成させます。',
        instructions: [
          '寸法線ツール（D）を選択',
          '矩形の左端をクリック',
          '矩形の右端をクリック',
          '寸法線が自動生成され「200」と表示',
        ],
        tips: [
          '寸法線は図形の外側に配置すると見やすい',
          '水平・垂直の寸法が作成可能',
        ],
        targetTool: 'dimension',
      },
      {
        id: 'complete-drawing',
        title: '図面の完成',
        description: '仕上げと確認を行います。',
        instructions: [
          '全体を確認（ズームアウトして俯瞰）',
          '必要に応じて注釈テキストを追加',
          'スタイル（線の太さ、色）を調整',
          '保存またはエクスポート',
        ],
        tips: [
          '印刷用にはSVG形式でエクスポート',
          '寸法線のテキストサイズも確認',
        ],
      },
    ],
  },
  {
    id: 'measure-dimension',
    title: '計測と寸法',
    description: '距離や角度の計測、寸法線の追加を学びます',
    steps: [
      {
        id: 'measure',
        title: '計測ツール',
        description: '距離や角度を計測します。',
        instructions: [
          'ツールバーから「計測」ツール（M）を選択',
          '2点をクリックで距離を計測',
          '3点をクリックで角度を計測',
          '計測結果はステータスバーに表示',
        ],
        tips: ['計測結果は一時的な表示で、保存されません'],
        targetTool: 'measure',
      },
      {
        id: 'dimension',
        title: '寸法線を追加',
        description: '図面に寸法線を追加します。',
        instructions: [
          'ツールバーから「寸法線」ツール（D）を選択',
          '始点をクリック',
          '終点をクリック',
          '寸法線が自動的に作成されます',
        ],
        tips: ['寸法線は図形として保存され、移動・削除も可能です'],
        targetTool: 'dimension',
      },
    ],
  },
  {
    id: 'undo-redo',
    title: '元に戻す・やり直す',
    description: '操作の取り消しとやり直しを学びます',
    steps: [
      {
        id: 'undo',
        title: '元に戻す（Undo）',
        description: '直前の操作を取り消します。',
        instructions: [
          'Ctrl+Z で直前の操作を取り消し',
          'ツールバーの「元に戻す」ボタンでも可能',
          '複数回実行で、さらに前の状態に戻る',
        ],
        tips: ['間違った操作をしても、すぐに戻せます'],
      },
      {
        id: 'redo',
        title: 'やり直す（Redo）',
        description: '取り消した操作をやり直します。',
        instructions: [
          'Ctrl+Y で取り消した操作をやり直し',
          'Ctrl+Shift+Z でも可能',
          'ツールバーの「やり直す」ボタンでも可能',
        ],
        tips: ['Undoしすぎた場合に使用します'],
      },
    ],
  },
  {
    id: 'save-export',
    title: '保存とエクスポート',
    description: '描画の保存と画像出力を学びます',
    steps: [
      {
        id: 'save',
        title: '描画を保存',
        description: '作成した図面を保存します。',
        instructions: [
          'ヘッダーの「保存」ボタンをクリック',
          '名前を入力して保存',
          '保存した図面は「図形描画」一覧から開けます',
        ],
        tips: [
          'Ctrl+S で保存',
          '自動保存も有効なので、作業中のデータは保持されます',
        ],
      },
      {
        id: 'export',
        title: '画像としてエクスポート',
        description: 'PNG、JPEG、SVG形式で出力します。',
        instructions: [
          'ツールバーの「エクスポート」ボタン（Ctrl+E）をクリック',
          '出力形式を選択（PNG/JPEG/SVG）',
          '「エクスポート」ボタンでダウンロード',
        ],
        tips: [
          'PNGは透過背景、JPEGは白背景',
          'SVGはベクター形式で拡大しても劣化しません',
        ],
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'キーボードショートカット',
    description: '効率的な操作のためのショートカット一覧',
    steps: [
      {
        id: 'tool-shortcuts',
        title: 'ツール切り替え',
        description: 'キーボードでツールを素早く切り替えます。',
        instructions: [
          'V: 選択ツール',
          'L: 線ツール',
          'C: 円ツール',
          'A: 円弧ツール',
          'R: 矩形ツール',
          'P: 多角形ツール',
        ],
        tips: [
          'T: テキストツール',
          'W: 矢印ツール',
          'F: フリーハンドツール',
          'D: 寸法線ツール',
          'M: 計測ツール',
        ],
      },
      {
        id: 'edit-shortcuts',
        title: '編集操作',
        description: 'よく使う編集操作のショートカットです。',
        instructions: [
          'Ctrl+Z: 元に戻す',
          'Ctrl+Y: やり直す',
          'Ctrl+C: コピー',
          'Ctrl+X: カット',
          'Ctrl+V: ペースト',
          'Ctrl+D: 複製',
        ],
        tips: [
          'Delete/Backspace: 削除',
          'Ctrl+A: 全選択',
          'Escape: 選択解除・キャンセル',
        ],
      },
      {
        id: 'view-shortcuts',
        title: '表示操作',
        description: 'ズームやグリッドのショートカットです。',
        instructions: [
          'Ctrl++: ズームイン',
          'Ctrl+-: ズームアウト',
          'Ctrl+0: ズームリセット',
          'G: グリッド表示切替',
          'Space+ドラッグ: パン（移動）',
        ],
        tips: ['マウスホイールでもズーム操作が可能です'],
      },
      {
        id: 'transform-shortcuts',
        title: '変形・グループ',
        description: '変形とグループ化のショートカットです。',
        instructions: [
          'H: 水平反転',
          'J: 垂直反転',
          'Ctrl+G: グループ化',
          'Ctrl+Shift+G: グループ解除',
        ],
        tips: ['Shift+ドラッグ: 制約付き描画（正方形、正円など）'],
      },
      {
        id: 'file-shortcuts',
        title: 'ファイル操作',
        description: '保存とエクスポートのショートカットです。',
        instructions: [
          'Ctrl+S: 保存',
          'Ctrl+E: エクスポート',
          'Ctrl+I: 画像挿入',
        ],
        tips: ['これらのショートカットで作業効率が大幅に向上します'],
      },
    ],
  },
  {
    id: 'complete',
    title: 'チュートリアル完了',
    description: 'チュートリアルのまとめ',
    steps: [
      {
        id: 'summary',
        title: 'お疲れ様でした！',
        description:
          'おめでとうございます！図形描画の全機能を学びました。',
        instructions: [
          '自由に図形を描いて練習してみましょう',
          '「図形描画」ページに戻って実際の図面を作成できます',
        ],
        tips: [
          'キーボードショートカットを覚えると作業効率がアップします',
          '困ったときはこのチュートリアルにいつでも戻れます',
        ],
      },
    ],
  },
]

export function getTotalSteps(): number {
  return tutorialChapters.reduce((sum, chapter) => sum + chapter.steps.length, 0)
}

export function getStepIndex(chapterIndex: number, stepIndex: number): number {
  let index = 0
  for (let i = 0; i < chapterIndex; i++) {
    index += tutorialChapters[i].steps.length
  }
  return index + stepIndex
}

export function getChapterAndStepFromIndex(
  globalIndex: number
): { chapterIndex: number; stepIndex: number } | null {
  let currentIndex = 0
  for (let i = 0; i < tutorialChapters.length; i++) {
    const chapter = tutorialChapters[i]
    if (currentIndex + chapter.steps.length > globalIndex) {
      return {
        chapterIndex: i,
        stepIndex: globalIndex - currentIndex,
      }
    }
    currentIndex += chapter.steps.length
  }
  return null
}
