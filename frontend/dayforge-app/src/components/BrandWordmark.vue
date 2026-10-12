<template>
  <strong class="brand-wordmark">
    <svg
      class="brand-wordmark__mark"
      viewBox="8 8 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 8H32A24 24 0 0 1 50.73 17H8Z" />
      <path class="brand-wordmark__now" d="M8 21H53.33A24 24 0 0 1 55.92 30H8Z" />
      <path d="M8 34H55.92A24 24 0 0 1 53.33 43H8Z" />
      <path d="M8 47H50.73A24 24 0 0 1 32 56H8Z" />
    </svg>
    <span aria-hidden="true">ayForge</span>
    <span class="brand-wordmark__name">DayForge</span>
  </strong>
</template>

<style scoped>
.brand-wordmark {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}

.brand-wordmark__mark {
  width: 0.74em;
  height: 0.74em;
  margin-right: 0.06em;
  align-self: baseline;
  fill: currentColor;
}

.brand-wordmark__now {
  fill: #ff7a2f;
}

.brand-wordmark__name {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
