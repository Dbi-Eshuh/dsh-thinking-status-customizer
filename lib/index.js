// src/host.ts
function apply(ctx) {
  ctx.effect(() => () => {
  }, "dsh-thinking-status-customizer: host loader entry");
}
export {
  apply
};
