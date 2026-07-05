
type Segment = {
  title: string;
  description: string;
};

function Text({ title, description }: Segment) {
  return (
    <div>
      <h1 className={"headline-2"}>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}

export default Text;
