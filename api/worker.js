export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'screen-ordering-api', phase: 'api-folder-health-check' });
    }
    return Response.json({ error: 'Not found', path: url.pathname }, { status: 404 });
  }
};
