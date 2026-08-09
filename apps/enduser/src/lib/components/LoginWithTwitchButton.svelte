<script lang="ts">
  interface Props {
    width?: number;
    onclick?: () => void;
  }

  let { width = undefined, onclick = () => {} }: Props = $props();
</script>

<button class="twitch-login-btn" style:width={width ? `${width}px` : undefined} {onclick}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="278.16 0 640 127.39"
    xml:space="preserve"
    class="twitch-icon"
  >
    <g transform="matrix(1.3333333,0,0,-1.3333333,-180.53426,935.79824)">
      <g transform="translate(420.064,651.1567)">
        <path
          style="fill:currentColor;fill-opacity:1;fill-rule:evenodd;stroke:none"
          d="m 0,0 -13.652,-13.651 -21.445,0 -11.699,-11.697 0,11.697 -17.548,0 0,56.544 L 0,42.893 0,0 Z m -72.146,50.692 -3.899,-15.599 0,-70.19 17.55,0 0,-9.751 9.746,0 9.752,9.751 15.596,0 31.196,31.192 0,54.597 -79.941,0 z"
        />
      </g>
      <path
        style="fill:currentColor;fill-opacity:1;fill-rule:evenodd;stroke:none"
        d="m 377.167,655.053 7.799,0 0,23.401 -7.799,0 0,-23.401 z m 21.446,0 7.799,0 0,23.401 -7.799,0 0,-23.401 z"
      />
    </g>
    <text
      x="404"
      y="75.695"
      font-family="Arial, Helvetica, sans-serif"
      font-size="60"
      font-weight="700"
      fill="currentColor"
      dominant-baseline="middle">Login with Twitch</text
    >
  </svg>
</button>

<style>
  .twitch-login-btn {
    background: transparent;
    border: 2px solid #6441a5;
    border-radius: 8px;
    padding: 10px 20px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #6441a5;
    transition: all 0.2s ease-in-out;
    outline: none;
  }

  .twitch-icon {
    width: 250px;
    height: auto;
  }

  .twitch-login-btn:hover {
    background-color: #6441a5;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(100, 65, 165, 0.3);
  }

  .twitch-login-btn:active {
    transform: scale(0.98);
  }
</style>
