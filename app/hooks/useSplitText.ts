
const splitNameEl = (el: HTMLElement) => {
  const letters: HTMLElement[] = [];

  el.querySelectorAll('.ln').forEach((ln) => {
    const wd = ln.querySelector('.wd') as HTMLElement | null;

    if (!wd) return;

    const chars: { c: string; italic: boolean }[] = [];

    wd.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        (node.textContent || '')
          .split('')
          .forEach((c) => {
            chars.push({
              c,
              italic: false,
            });
          });
      } else if (node.nodeName === 'EM') {
        (node.textContent || '')
          .split('')
          .forEach((c) => {
            chars.push({
              c,
              italic: true,
            });
          });
      }
    });

    wd.innerHTML = chars
      .map(({ c, italic }) => {
        const col = italic
          ? 'color:var(--mint);font-style:italic;'
          : '';

        const ch = c === ' ' ? '&nbsp;' : c;

        return `<span class="sw-wrap" style="display:inline-block;overflow:hidden;vertical-align:bottom"><span class="sw" style="display:inline-block;${col}">${ch}</span></span>`;
      })
      .join('');

    letters.push(
      ...(Array.from(
        wd.querySelectorAll('.sw')
      ) as HTMLElement[])
    );
  });

  return letters;
};

export default splitNameEl;