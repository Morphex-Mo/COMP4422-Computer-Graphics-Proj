/**
 * 场景选择器 UI
 * 提供可视化的场景选择界面，支持鼠标点击切换场景
 */

export interface SceneOption {
    id: string;
    name: string;
    description?: string;
    handler: () => Promise<void>;
}

export class SceneSelector {
    private container: HTMLDivElement;
    private isVisible: boolean = true;

    constructor(private scenes: SceneOption[]) {
        this.container = this.createUI();
        this.attachToDOM();
    }

    private createUI(): HTMLDivElement {
        const container = document.createElement('div');
        container.id = 'scene-selector';
        container.innerHTML = `
            <style>
                #scene-selector {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(20, 20, 40, 0.95);
                    border: 2px solid #00ff88;
                    border-radius: 12px;
                    padding: 30px;
                    z-index: 10000;
                    box-shadow: 0 10px 40px rgba(0, 255, 136, 0.3);
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    font-family: 'Arial', sans-serif;
                }
                
                #scene-selector.hidden {
                    display: none;
                }
                
                .selector-header {
                    text-align: center;
                    margin-bottom: 25px;
                    color: #00ff88;
                }
                
                .selector-header h1 {
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
                }
                
                .selector-header p {
                    margin: 0;
                    font-size: 14px;
                    color: #aaa;
                }
                
                .scene-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .scene-card {
                    background: rgba(30, 30, 60, 0.8);
                    border: 2px solid #444;
                    border-radius: 8px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .scene-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, transparent, rgba(0, 255, 136, 0.1));
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .scene-card:hover {
                    border-color: #00ff88;
                    transform: translateY(-3px);
                    box-shadow: 0 5px 20px rgba(0, 255, 136, 0.3);
                }
                
                .scene-card:hover::before {
                    opacity: 1;
                }
                
                .scene-card:active {
                    transform: translateY(-1px);
                }
                
                .scene-card h3 {
                    margin: 0 0 10px 0;
                    color: #00ff88;
                    font-size: 18px;
                    position: relative;
                    z-index: 1;
                }
                
                .scene-card p {
                    margin: 0;
                    color: #ccc;
                    font-size: 13px;
                    line-height: 1.5;
                    position: relative;
                    z-index: 1;
                }
                
                .scene-card .scene-id {
                    color: #888;
                    font-size: 11px;
                    margin-top: 8px;
                    font-family: monospace;
                }
                
                .toggle-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(20, 20, 40, 0.95);
                    border: 2px solid #00ff88;
                    border-radius: 8px;
                    padding: 12px 20px;
                    color: #00ff88;
                    cursor: pointer;
                    z-index: 10001;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
                }
                
                .toggle-button:hover {
                    background: rgba(0, 255, 136, 0.2);
                    transform: scale(1.05);
                }
                
                .toggle-button:active {
                    transform: scale(0.95);
                }
                
                /* 滚动条样式 */
                #scene-selector::-webkit-scrollbar {
                    width: 8px;
                }
                
                #scene-selector::-webkit-scrollbar-track {
                    background: rgba(30, 30, 60, 0.5);
                    border-radius: 4px;
                }
                
                #scene-selector::-webkit-scrollbar-thumb {
                    background: #00ff88;
                    border-radius: 4px;
                }
                
                #scene-selector::-webkit-scrollbar-thumb:hover {
                    background: #00cc66;
                }
            </style>
            <div class="selector-header">
                <h1>🎮 场景选择器</h1>
                <p>点击下方卡片选择要加载的场景</p>
            </div>
            <div class="scene-grid" id="scene-grid"></div>
        `;

        return container;
    }

    private attachToDOM(): void {
        document.body.appendChild(this.container);
        this.createToggleButton();
        this.renderScenes();
    }

    private createToggleButton(): void {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-button';
        toggleBtn.textContent = '📋 场景菜单';
        toggleBtn.onclick = () => this.toggle();
        document.body.appendChild(toggleBtn);
    }

    private renderScenes(): void {
        const grid = this.container.querySelector('#scene-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.scenes.forEach(scene => {
            const card = document.createElement('div');
            card.className = 'scene-card';
            card.innerHTML = `
                <h3>${scene.name}</h3>
                <p>${scene.description || '暂无描述'}</p>
                <div class="scene-id">ID: ${scene.id}</div>
            `;

            card.onclick = async () => {
                this.handleSceneSelect(scene);
            };

            grid.appendChild(card);
        });
    }

    private async handleSceneSelect(scene: SceneOption): Promise<void> {
        console.log(`[SceneSelector] 选择场景: ${scene.name} (${scene.id})`);

        // 隐藏选择器
        this.hide();

        try {
            // 调用场景处理函数
            await scene.handler();
        } catch (error) {
            console.error(`[SceneSelector] 场景加载失败:`, error);
            alert(`场景加载失败: ${error}`);
            // 加载失败时重新显示选择器
            this.show();
        }
    }

    public show(): void {
        this.isVisible = true;
        this.container.classList.remove('hidden');
    }

    public hide(): void {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }

    public toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    public destroy(): void {
        this.container.remove();
        const toggleBtn = document.querySelector('.toggle-button');
        if (toggleBtn) {
            toggleBtn.remove();
        }
    }
}

