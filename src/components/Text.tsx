
type TextProps = {
  title: string;
  description: string;
  dangerously: boolean;
};

function Text({ title, description, dangerously }: TextProps) {

  return (
    <div>
      <h1 className={"headline-2"}>{title}</h1>

      {dangerously && (
        <div dangerouslySetInnerHTML={{ __html: description }} />
      )}

      {!dangerously && (
        <p>{description}</p>
      )}

    </div>
  );
}

export default Text;
