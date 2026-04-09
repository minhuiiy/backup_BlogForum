import { Directive, ElementRef, Input, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import hljs from 'highlight.js';

/**
 * Directive: [codeHighlight]
 * Tự động highlight tất cả code blocks trong nội dung HTML sau khi render.
 * Sử dụng: <div [codeHighlight] [innerHTML]="post.content"></div>
 */
@Directive({
  selector: '[codeHighlight]',
  standalone: true
})
export class CodeHighlightDirective implements OnChanges, AfterViewInit {
  @Input('codeHighlight') content: string | null = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.applyHighlight();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      // Chờ DOM render xong
      setTimeout(() => this.applyHighlight(), 50);
    }
  }

  private applyHighlight(): void {
    const hostEl: HTMLElement = this.el.nativeElement;

    // Quill tạo ra <pre class="ql-syntax">...</pre>
    // Render bình thường tạo <pre><code class="language-*">...</code></pre>
    const codeBlocks = hostEl.querySelectorAll('pre code, pre.ql-syntax');

    codeBlocks.forEach((block: Element) => {
      // Nếu đã highlight rồi thì bỏ qua
      if (block.classList.contains('hljs')) return;

      // Decode HTML entities trước khi highlight
      const rawText = block.innerHTML
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      block.textContent = rawText;
      hljs.highlightElement(block as HTMLElement);
    });

    // Thêm copy button cho mỗi block
    this.addCopyButtons(hostEl);
  }

  private addCopyButtons(hostEl: HTMLElement): void {
    const preBlocks = hostEl.querySelectorAll('pre');
    preBlocks.forEach((pre: HTMLElement) => {
      // Tránh thêm nhiều lần
      if (pre.querySelector('.copy-btn')) return;

      // Detect language
      const codeEl = pre.querySelector('code');
      const lang = codeEl?.className?.match(/language-(\w+)/)?.[1]
                || (codeEl as HTMLElement)?.dataset?.['highlighted']
                || 'Code';

      // Wrapper
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;margin:1.5em 0;';

      // Language badge
      const badge = document.createElement('div');
      badge.textContent = lang.toUpperCase();
      badge.style.cssText = `
        position:absolute;top:0;left:0;
        padding:2px 10px;font-size:11px;font-weight:700;
        background:#1e3a5f;color:#7eb8f7;
        font-family:'JetBrains Mono',monospace;
        border-radius:8px 0 8px 0;letter-spacing:0.05em;
        user-select:none;z-index:2;
      `;

      // Copy button
      const btn = document.createElement('button');
      btn.classList.add('copy-btn');
      btn.innerHTML = `<span style="font-size:14px">📋</span> Copy`;
      btn.style.cssText = `
        position:absolute;top:8px;right:8px;
        padding:4px 12px;font-size:12px;font-weight:600;
        background:rgba(126,184,247,0.15);color:#7eb8f7;
        border:1px solid rgba(126,184,247,0.3);border-radius:6px;
        cursor:pointer;transition:all 0.2s;z-index:2;
        font-family:'JetBrains Mono',monospace;
      `;
      btn.onmouseenter = () => { btn.style.background = 'rgba(126,184,247,0.3)'; };
      btn.onmouseleave = () => { btn.style.background = 'rgba(126,184,247,0.15)'; };
      btn.onclick = () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          btn.innerHTML = `<span style="font-size:14px">✅</span> Copied!`;
          btn.style.color = '#4ade80';
          btn.style.borderColor = 'rgba(74,222,128,0.4)';
          setTimeout(() => {
            btn.innerHTML = `<span style="font-size:14px">📋</span> Copy`;
            btn.style.color = '#7eb8f7';
            btn.style.borderColor = 'rgba(126,184,247,0.3)';
          }, 2000);
        });
      };

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(badge);
      wrapper.appendChild(btn);
      wrapper.appendChild(pre);

      // Style pre block
      pre.style.cssText = `
        background:#0d1117 !important;
        border-radius:0 12px 12px 12px !important;
        padding:3em 1.5em 1.5em !important;
        overflow-x:auto;
        border:1px solid rgba(126,184,247,0.15) !important;
        font-family:'JetBrains Mono','Fira Code',monospace !important;
        font-size:14px !important;
        line-height:1.7 !important;
        margin:0 !important;
      `;
    });
  }
}
