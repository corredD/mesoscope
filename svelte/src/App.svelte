<script>
  import { Canvas, T } from '@threlte/core'
  import { PerspectiveCamera, OrbitControls } from '@threlte/extras'
</script>

<Canvas>
  <PerspectiveCamera makeDefault position={[0, 0, 4]} />
  <OrbitControls />
  <T.AmbientLight intensity={0.5} />
  <T.DirectionalLight position={[5, 10, 5]} intensity={1} />
  <T.Mesh>
    <T.BoxGeometry />
    <T.MeshStandardMaterial color="white" />
  </T.Mesh>
</Canvas>

<div class="overlay">
  <h1>Mesoscope 3D</h1>
  <p>Interactive 3D mesoscope using Svelte & Threlte</p>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: black;
  }
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 2rem;
    color: white;
    font-family: sans-serif;
    pointer-events: none;
  }
</style>
